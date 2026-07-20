import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreGauge from '../components/ScoreGauge';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import Projection5Ans from '../components/Projection5Ans';
import FinancialTable from '../components/FinancialTable';
import CommentSection from '../components/CommentSection';
import FavoriteButton from '../components/FavoriteButton';
import TraceabilityPanel from '../components/TraceabilityPanel';
import { formatCHF, formatPercent, normalizeAnalyses, WORKFLOW_STATUSES } from '../utils/calculations';
import { formatSipaValue } from '../utils/excelImport';
import { exportAnalysisPdf, exportPropertyPdf } from '../utils/pdfExports';
import PdfExportDialog from '../components/PdfExportDialog';
import { listAuditLogs, recordAuditLog } from '../utils/auditLogs';
import { toast } from 'sonner';
import moment from 'moment';
import {
  ArrowLeft,
  Download,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Ruler,
  Home,
  ExternalLink,
  Loader2,
  Activity,
  Eye,
  Building2,
  FileText,
  TrendingUp,
  Car,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { permissions, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [analysisViewMode, setAnalysisViewMode] = useState('simplified');

  const canEdit = isAdmin || permissions.can_edit_property;
  const canDelete = isAdmin || permissions.can_delete_property;
  const canCreateAnalysis = isAdmin || permissions.can_create_analysis;
  const canEditAnalysis = isAdmin || permissions.can_edit_analysis;
  const canDeleteAnalysis = isAdmin || permissions.can_delete_analysis;

  const { data: property, isLoading: lp } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.Property.get(propertyId),
  });

  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses', propertyId],
    queryFn: () => base44.entities.Analysis.filter({ property_id: propertyId }, '-created_date', 50),
  });

  const { data: comments = [], isLoading: lc } = useQuery({
    queryKey: ['comments', propertyId],
    queryFn: () => base44.entities.Comment.filter({ property_id: propertyId }, '-created_date', 50),
    enabled: !!propertyId,
  });

  const refreshAlertBadgeQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['nav-alert-properties'] });
    queryClient.invalidateQueries({ queryKey: ['nav-alert-analyses'] });
    queryClient.invalidateQueries({ queryKey: ['nav-alert-audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['alerts-audit-logs'] });
  };

  const deleteProperty = useMutation({
    mutationFn: async () => {
      const result = await base44.entities.Property.delete(propertyId);
      await recordAuditLog({
        eventType: 'property_soft_deleted',
        severity: 'warning',
        targetType: 'property',
        targetId: propertyId,
        targetLabel: property?.nom_bien,
        metadata: {
          property_id: propertyId,
          property_name: property?.nom_bien,
        },
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      refreshAlertBadgeQueries();
      navigate('/properties');
    },
  });

  const deleteAnalysis = useMutation({
    mutationFn: async (id) => {
      const analysis = analyses.find((item) => item.id === id);
      const result = await base44.entities.Analysis.delete(id);
      await recordAuditLog({
        eventType: 'analysis_soft_deleted',
        severity: 'warning',
        targetType: 'analysis',
        targetId: id,
        targetLabel: property?.nom_bien || `Analyse #${id?.slice(0, 8)}`,
        metadata: {
          property_id: analysis?.property_id || propertyId,
          property_name: property?.nom_bien,
          analysis_id: id,
        },
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', propertyId] });
      refreshAlertBadgeQueries();
    },
  });

  const updatePropertyStatus = useMutation({
    mutationFn: async (newStatus) => {
      const previousStatus = property?.statut || null;
      const result = await base44.entities.Property.update(propertyId, { statut: newStatus });
      await recordAuditLog({
        eventType: 'property_status_changed',
        targetType: 'property',
        targetId: propertyId,
        targetLabel: property?.nom_bien,
        metadata: {
          property_id: propertyId,
          property_name: property?.nom_bien,
          previous_status: previousStatus,
          new_status: newStatus,
        },
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Statut du bien mis à jour');
    },
    onError: (error) => {
      console.error('[PropertyDetail] status update failed:', error);
      toast.error('Impossible de mettre à jour le statut');
    },
  });

  const updateCouleur = useMutation({
    mutationFn: (couleur) => base44.entities.Property.update(propertyId, { couleur }),
    onMutate: async (couleur) => {
      await queryClient.cancelQueries({ queryKey: ['property', propertyId] });
      queryClient.setQueryData(['property', propertyId], (old) => old ? { ...old, couleur } : old);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  if (lp || la || lc) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return <div className="p-8 text-center text-muted-foreground">Bien non trouvé</div>;
  }

  const normalizedAnalyses = normalizeAnalyses(analyses, property);
  const latest = normalizedAnalyses[0];
  const selected = selectedAnalysisId
    ? normalizedAnalyses.find((analysis) => analysis.id === selectedAnalysisId) || latest
    : latest;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <Link to="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">{property.nom_bien}</h1>
          <PropertyMeta property={property} compact />
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <FavoriteButton propertyId={propertyId} variant="outline" className="h-8 w-8" />

          <Button size="sm" variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => exportPropertyPdf(property, normalizedAnalyses)}>
            <Download className="h-3.5 w-3.5" />
            PDF bien
          </Button>

          {selected && <PdfExportDialog onExport={(sections) => exportAnalysisPdf(property, selected, sections)} />}

          {canCreateAnalysis && (
            <Link to={`/new-analysis?propertyId=${propertyId}`}>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Analyse
              </Button>
            </Link>
          )}

          {canEdit && (
            <Link to={`/edit-property/${propertyId}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}

          {canDelete && (
            <DeletePropertyDialog onDelete={() => deleteProperty.mutate()} />
          )}
        </div>
      </div>

      <Tabs defaultValue="presentation" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-background border border-border rounded-xl p-1">
          <TabsTrigger value="presentation">Présentation du bien</TabsTrigger>
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
          <TabsTrigger value="infos">Infos supplémentaires</TabsTrigger>
        </TabsList>

        <TabsContent value="presentation" className="mt-5">
          <PropertyPresentation property={property} latest={latest} comments={comments} updateCouleur={updateCouleur} />
        </TabsContent>

        <TabsContent value="analyse" className="mt-5 space-y-6">
          {selected ? (
            <>
              <AnalysisViewModeToggle value={analysisViewMode} onChange={setAnalysisViewMode} />
              <AnalysisSummary
                property={property}
                selected={selected}
                selectedAnalysisId={selectedAnalysisId}
                canEdit={canEdit}
                isUpdatingStatus={updatePropertyStatus.isPending}
                onStatusChange={(status) => updatePropertyStatus.mutate(status)}
              />
              {analysisViewMode === 'simplified' ? (
                <>
                  <FinancialTable analysis={selected} />
                  {selected.sipa_data && selected.sipa_data.filter((e) => !e._custom).length > 0 && (
                    <SipaImportedDataTable analysis={selected} />
                  )}
                </>
              ) : (
                <TechnicalAnalysisSnapshot analysis={selected} canEditAnalysis={canEditAnalysis} />
              )}
              
              <Projection5Ans analysis={selected} />
              <AnalysisHistory
                property={property}
                analyses={normalizedAnalyses}
                selectedAnalysisId={selectedAnalysisId}
                setSelectedAnalysisId={setSelectedAnalysisId}
                canEditAnalysis={canEditAnalysis}
                canDeleteAnalysis={canDeleteAnalysis}
                deleteAnalysis={deleteAnalysis}
              />
            </>
          ) : (
            <EmptyAnalysis canCreateAnalysis={canCreateAnalysis} propertyId={propertyId} />
          )}
        </TabsContent>

        <TabsContent value="infos" className="mt-5 space-y-6">
          {selected?.notes && (
            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Informations complémentaires</h3>
              </div>
              <pre className="w-full bg-background border border-border rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-words">{selected.notes}</pre>
            </section>
          )}
          <CommentSection propertyId={propertyId} initialComments={comments} />
          <TraceabilityPanel
            property={property}
            analyses={normalizedAnalyses}
            comments={comments}
            userName={user?.full_name || user?.email}
          />
          <ActivityFeed propertyId={propertyId} />
        </TabsContent>
      </Tabs>

    </div>
  );
}

function AnalysisViewModeToggle({ value, onChange }) {
  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm">Vue d'analyse</h3>
          <p className="text-xs text-muted-foreground mt-1">
            La vue simplifiee garde l'affichage actuel. La vue technique presente les donnees en grille.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => onChange('simplified')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value === 'simplified'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Simplifie
          </button>
          <button
            type="button"
            onClick={() => onChange('technical')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value === 'technical'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Technique
          </button>
        </div>
      </div>
    </section>
  );
}

function TechnicalAnalysisSnapshot({ analysis, canEditAnalysis }) {
  const prixTotal = Math.round(
    Number(analysis.prix_bien || 0) +
    Number(analysis.versement_initial || 0) +
    Number(analysis.amortissement_5_ans || 0) +
    Number(analysis.honoraires_sipa || 0) +
    Number(analysis.frais_dossier_bancaire || 0)
  );
  const customFields = analysis.sipa_data ? analysis.sipa_data.filter((entry) => entry._custom) : [];

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h3 className="font-heading font-semibold">Vue technique</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Lecture type Excel de l'analyse selectionnee.
            </p>
          </div>
          {canEditAnalysis && (
            <Link to={`/edit-analysis/${analysis.id}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            </Link>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <TechHeader>Bloc</TechHeader>
                <TechHeader>Rubrique</TechHeader>
                <TechHeader align="right">Montant CHF</TechHeader>
                <TechHeader align="right">%</TechHeader>
                <TechHeader align="right">Calcul</TechHeader>
              </tr>
            </thead>
            <tbody>
              <TechReadRow section="Acquisition" label="Prix du bien" amount={analysis.prix_bien} />
              <TechReadRow section="Acquisition" label="Versement initial copropriete" amount={analysis.versement_initial} />
              <TechReadRow section="Acquisition" label="Amortissement sur 5 ans" amount={analysis.amortissement_5_ans} />
              <TechReadRow section="Acquisition" label="Honoraires transaction SIPA" amount={analysis.honoraires_sipa} pct={percentOf(analysis.honoraires_sipa, analysis.prix_bien)} />
              <TechReadRow section="Acquisition" label="Frais de dossier bancaire" amount={analysis.frais_dossier_bancaire} />
              <TechReadComputedRow section="Acquisition" label="Prix total" value={formatCHF(prixTotal)} strong />
              <TechReadRow section="Financement" label="Fonds propres" amount={analysis.fonds_propres} />
              <TechReadRow section="Financement" label="Hypotheque" amount={analysis.hypotheque} pct={percentOf(analysis.hypotheque, prixTotal)} />
              <TechReadRow section="Exploitation" label="Revenus locatifs hors charges" amount={analysis.revenus_locatifs} />
              <TechReadComputedRow section="Exploitation" label="Taux de rendement brut" value={formatPercent(analysis.rendement_brut)} />
              <TechReadRow section="Exploitation" label="Charges operationnelles" amount={analysis.charges_operationnelles} />
              <TechReadRow section="Exploitation" label="Interet hypothecaire moyen 5 ans" amount={analysis.interets_hypothecaires} pct={percentOf(analysis.interets_hypothecaires, analysis.hypotheque)} />
              <TechReadRow section="Exploitation" label="Honoraires de gestion" amount={analysis.gestion} pct={percentOf(analysis.gestion, analysis.revenus_locatifs)} />
              <TechReadComputedRow section="Exploitation" label="Revenu net" value={formatCHF(analysis.revenu_net)} strong />
              <TechReadComputedRow section="Exploitation" label="Rendement net sur fonds propres" value={formatPercent(analysis.rendement_net_fonds_propres)} />
              <TechReadRow section="Fiscalite" label="Impot" amount={analysis.impot} pct={percentOf(analysis.impot, analysis.revenu_net)} />
              <TechReadComputedRow section="Distribution" label="Revenu distribue" value={formatCHF(analysis.revenu_distribue)} strong />
              <TechReadComputedRow section="Distribution" label="Revenu distribue / fonds propres" value={formatPercent(analysis.revenu_distribue_fonds_propres)} />
              {customFields.map((entry, index) => {
                const amount = entry.values?.find((value) => value.type === 'amount');
                const pct = entry.values?.find((value) => value.type === 'pct');
                return (
                  <TechReadRow
                    key={`${entry.label}-${index}`}
                    section="Personnalise"
                    label={entry.label}
                    amount={amount?.value}
                    pct={pct?.value}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5">Hypotheses bancaires techniques</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <TechHeader>Banque</TechHeader>
                <TechHeader>Type de taux</TechHeader>
                <TechHeader align="right">Taux base</TechHeader>
                <TechHeader align="right">Marge SARON</TechHeader>
                <TechHeader align="right">Amortissement</TechHeader>
                <TechHeader>Evaluation</TechHeader>
              </tr>
            </thead>
            <tbody>
              <TechBankSnapshot title="Banque A" analysis={analysis} prefix="banque_a" />
              <TechBankSnapshot title="Banque B" analysis={analysis} prefix="banque_b" />
            </tbody>
          </table>
        </div>
      </section>

      {analysis.sipa_data && analysis.sipa_data.filter((entry) => !entry._custom).length > 0 && (
        <SipaImportedDataTable analysis={analysis} />
      )}
    </div>
  );
}

function SipaImportedDataTable({ analysis }) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold">Investissement SIPA</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
              <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Valeurs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {analysis.sipa_data.filter((e) => !e._custom).map((entry, i) => (
              <tr key={i}>
                <td className="py-2.5 pr-4 text-sm font-medium whitespace-nowrap">{entry.label}</td>
                <td className="py-2.5 pl-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {entry.values.map((v, j) => (
                      <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted/30">{formatSipaValue(v)}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TechHeader({ children, align = 'left' }) {
  return (
    <th className={`border-b border-r border-border px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0`}>
      {children}
    </th>
  );
}

function TechCell({ children, align = 'left', className = '' }) {
  return (
    <td className={`border-b border-r border-border px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}

function TechReadRow({ section, label, amount, pct }) {
  return (
    <tr>
      <TechCell className="font-medium text-muted-foreground">{section}</TechCell>
      <TechCell>{label}</TechCell>
      <TechCell align="right" className="font-mono">{formatCHF(amount)}</TechCell>
      <TechCell align="right" className="font-mono">{pct == null ? '-' : formatPercent(pct)}</TechCell>
      <TechCell />
    </tr>
  );
}

function TechReadComputedRow({ section, label, value, strong = false }) {
  return (
    <tr className={strong ? 'bg-primary/5' : 'bg-muted/20'}>
      <TechCell className="font-medium text-muted-foreground">{section}</TechCell>
      <TechCell className={strong ? 'font-semibold text-primary' : 'text-muted-foreground'}>{label}</TechCell>
      <TechCell />
      <TechCell />
      <TechCell align="right" className={`font-mono ${strong ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
        {value}
      </TechCell>
    </tr>
  );
}

function TechBankSnapshot({ title, analysis, prefix }) {
  return (
    <tr>
      <TechCell className="font-medium text-muted-foreground">{title}</TechCell>
      <TechCell>{analysis[`${prefix}_type_taux`] || 'fixe'}</TechCell>
      <TechCell align="right" className="font-mono">{formatPercent(analysis[`${prefix}_taux_hypothecaire`])}</TechCell>
      <TechCell align="right" className="font-mono">{formatPercent(analysis[`${prefix}_marge_saron`])}</TechCell>
      <TechCell align="right" className="font-mono">{formatCHF(analysis[`${prefix}_amortissement_annuel`])}</TechCell>
      <TechCell>{analysis[`${prefix}_evaluation`] || '-'}</TechCell>
    </tr>
  );
}

function percentOf(amount, base) {
  const numericAmount = Number(amount || 0);
  const numericBase = Number(base || 0);
  if (!numericBase) return null;
  return Math.round((numericAmount / numericBase) * 10000) / 100;
}

function PropertyPresentation({ property, latest, comments, updateCouleur }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
      <section className={`bg-card rounded-xl border p-4 sm:p-6 ${property.couleur ? 'border-t-4' : 'border-border'}`}
        style={property.couleur ? { borderTopColor: property.couleur === 'rouge' ? '#ef4444' : property.couleur === 'orange' ? '#f97316' : '#22c55e' } : {}}>
        {property.image_url && (
          <div className="mb-5 overflow-hidden rounded-lg">
            <img src={property.image_url} alt={property.nom_bien} className="w-full h-56 object-cover" />
          </div>
        )}

        <div className="flex items-center gap-2 mb-5">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold">Présentation du bien</h2>
          <div className="ml-auto flex items-center gap-1.5">
            {['rouge', 'orange', 'vert'].map(c => (
              <button
                key={c}
                onClick={() => updateCouleur.mutate(property.couleur === c ? '' : c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${property.couleur === c ? 'border-white ring-2 ring-primary scale-110' : 'border-border/50 opacity-50 hover:opacity-100'}`}
                style={{ backgroundColor: c === 'rouge' ? '#ef4444' : c === 'orange' ? '#f97316' : '#22c55e' }}
                title={c}
              />
            ))}
            {property.couleur && (
              <button
                onClick={() => updateCouleur.mutate('')}
                className="text-xs text-muted-foreground hover:text-foreground ml-1" title="Enlever la couleur"
              >✕</button>
            )}
          </div>
        </div>

        <PropertyMeta property={property} />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label="Nom du bien" value={property.nom_bien} />
          <InfoItem label="Ville" value={property.ville} />
          <InfoItem label="Canton" value={property.canton} />
          <InfoItem label="Adresse" value={property.adresse} />
          <InfoItem label="Année de construction" value={property.annee_construction} />
          <InfoItem label="Surface" value={property.surface ? `${property.surface} m²` : null} />
          <InfoItem label="Nombre de logements" value={property.nombre_logements} />
          <InfoItem label="Nombre de bureaux" value={property.nombre_bureaux} />
          <InfoItem label="Nombre de parkings" value={property.nombre_parkings} />
          <InfoItem label="Statut" value={property.statut} />
        </div>

        {(property.lien_annonce || property.lien_piece_jointe) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {property.lien_annonce && (
              <ExternalButton href={property.lien_annonce} label="Annonce" />
            )}
            {property.lien_piece_jointe && (
              <ExternalButton href={property.lien_piece_jointe} label="Pièce jointe" />
            )}
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold">Synthèse récente</h2>
        </div>

        {latest ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ScoreGauge score={latest.score_global || 0} size={92} />
              <div>
                <div className="flex items-center gap-2">
                  <ScoreBadge note={latest.note} />
                  <StatusBadge statut={latest.statut} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Dernière analyse</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard label="Prix total" value={formatCHF(latest.prix_total)} />
              <MetricCard label="Rdt. brut" value={formatPercent(latest.rendement_brut)} />
              <MetricCard label="Revenu net" value={formatCHF(latest.revenu_net)} />
              <MetricCard label="Revenu distribué" value={formatCHF(latest.revenu_distribue)} />
              <MetricCard label="Rdt. net / FP" value={formatPercent(latest.rendement_net_fonds_propres)} highlight />
              {property.ville && latest.etat_batiment && (
                <MetricCard label="Localisation / État" value={`${property.ville} (${latest.score_emplacement ?? '?'}/15) / ${latest.etat_batiment}`} />
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-border">
              <CommentSection propertyId={property.id} initialComments={comments} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune analyse disponible pour ce bien.</p>
        )}
      </section>
    </div>
  );
}

function PropertyMeta({ property, compact = false }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm text-muted-foreground ${compact ? 'mt-1' : ''}`}>
      {property.ville && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {property.ville}{property.canton ? `, ${property.canton}` : ''}
        </span>
      )}
      {property.annee_construction && (
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {property.annee_construction}
        </span>
      )}
      {property.surface && (
        <span className="flex items-center gap-1">
          <Ruler className="h-3.5 w-3.5" />
          {property.surface} m²
        </span>
      )}
      {property.nombre_logements && (
        <span className="flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          {property.nombre_logements} logements
        </span>
      )}
      {property.nombre_bureaux && (
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {property.nombre_bureaux} bureaux
        </span>
      )}
      {property.nombre_parkings && (
        <span className="flex items-center gap-1">
          <Car className="h-3.5 w-3.5" />
          {property.nombre_parkings} parkings
        </span>
      )}
    </div>
  );
}

function AnalysisSummary({ property, selected, selectedAnalysisId, canEdit, isUpdatingStatus, onStatusChange }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex items-center gap-4">
          <ScoreGauge score={selected.score_global || 0} size={110} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScoreBadge note={selected.note} />
              <StatusBadge statut={selected.statut} />
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedAnalysisId ? 'Analyse sélectionnée' : 'Dernière analyse'}
            </p>
          </div>
        </div>

        <QuickPropertyStatusSelect
          status={property?.statut || 'brouillon'}
          canEdit={canEdit}
          disabled={isUpdatingStatus}
          onChange={onStatusChange}
        />

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricCard label="Prix total" value={formatCHF(selected.prix_total)} />
          <MetricCard label="Revenu net" value={formatCHF(selected.revenu_net)} />
          <MetricCard label="Revenu distribué" value={formatCHF(selected.revenu_distribue)} />
          <MetricCard label="Rdt. brut" value={formatPercent(selected.rendement_brut)} />
          <MetricCard label="Rdt. net / FP" value={formatPercent(selected.rendement_net_fonds_propres)} highlight />
          <MetricCard label="Rdt. dist. / FP" value={formatPercent(selected.revenu_distribue_fonds_propres)} highlight />
        </div>
      </div>
    </div>
  );
}

function QuickPropertyStatusSelect({ status, canEdit, disabled, onChange }) {
  if (!canEdit) {
    return (
      <div className="min-w-[180px] space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Statut du bien</p>
        <StatusBadge statut={status} />
      </div>
    );
  }

  return (
    <div className="w-full sm:w-56 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Changer le statut du bien</p>
      <Select value={status} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 bg-background">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          {WORKFLOW_STATUSES.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AnalysisHistory({ property, analyses, selectedAnalysisId, setSelectedAnalysisId, canEditAnalysis, canDeleteAnalysis, deleteAnalysis }) {
  if (analyses.length <= 1) return null;

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Historique des analyses ({analyses.length})</h3>
        {selectedAnalysisId && (
          <Button size="sm" variant="ghost" onClick={() => setSelectedAnalysisId(null)}>
            Voir la plus récente
          </Button>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className={`px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors cursor-pointer ${
              selectedAnalysisId === analysis.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/20'
            }`}
            onClick={() => setSelectedAnalysisId(analysis.id)}
          >
            <div className="flex items-center gap-3">
              <ScoreBadge note={analysis.note} />
              <div>
                <p className="text-sm font-medium">Score {analysis.score_global}/100 - {formatCHF(analysis.prix_total)}</p>
                <p className="text-xs text-muted-foreground">
                  {moment(analysis.created_at || analysis.created_date).format('DD MMM YYYY, HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <StatusBadge statut={analysis.statut} />

              <Link to={`/analysis/${analysis.id}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Visualiser
                </Button>
              </Link>

              {canEditAnalysis && (
                <Link to={`/edit-analysis/${analysis.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                </Link>
              )}

              <PdfExportDialog onExport={(sections) => exportAnalysisPdf(property, analysis, sections)}>
                <Button size="sm" variant="ghost">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </PdfExportDialog>

              {canDeleteAnalysis && (
                <DeleteAnalysisDialog onDelete={() => deleteAnalysis.mutate(analysis.id)} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyAnalysis({ canCreateAnalysis, propertyId }) {
  return (
    <div className="bg-card rounded-xl border border-border p-8 text-center">
      <p className="text-muted-foreground text-sm">Aucune analyse pour ce bien</p>
      {canCreateAnalysis && (
        <Link to={`/new-analysis?propertyId=${propertyId}`}>
          <Button size="sm" className="mt-3 gap-2">
            <Plus className="h-3.5 w-3.5" />
            Créer une analyse
          </Button>
        </Link>
      )}
    </div>
  );
}

function DeletePropertyDialog({ onDelete }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action supprimera le bien et toutes ses données associées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteAnalysisDialog({ onDelete }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette analyse ?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActivityFeed({ propertyId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['property-activity', propertyId],
    queryFn: () => listAuditLogs(200),
  });

  const relevantLogs = useMemo(() => {
    return logs
      .filter((log) => log.target_id === propertyId || log.metadata?.property_id === propertyId)
      .slice(0, 30);
  }, [logs, propertyId]);

  const EVENT_STYLES = {
    login: { label: 'Connexion', className: 'text-emerald-400 bg-emerald-500/10' },
    logout: { label: 'Déconnexion', className: 'text-muted-foreground bg-secondary' },
    export_pdf: { label: 'Export PDF', className: 'text-amber-400 bg-amber-500/10' },
    property_created: { label: 'Bien créé', className: 'text-primary bg-primary/10' },
    property_updated: { label: 'Bien modifié', className: 'text-blue-400 bg-blue-500/10' },
    analysis_created: { label: 'Analyse créée', className: 'text-violet-400 bg-violet-500/10' },
    analysis_updated: { label: 'Analyse modifiée', className: 'text-blue-400 bg-blue-500/10' },
  };

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Fil d'activité</h3>
        {!isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {relevantLogs.length} événement{relevantLogs.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : relevantLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune activité enregistrée pour ce bien.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {relevantLogs.map((log) => {
              const style = EVENT_STYLES[log.event_type] || {
                label: log.event_type || 'Événement',
                className: 'text-primary bg-primary/10',
              };

              return (
                <div key={log.id || `${log.event_type}-${log.created_at}`} className="flex gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${style.className}`}>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{style.label}</p>
                      <span className="text-xs text-muted-foreground">{moment(log.created_at).format('DD MMM YYYY, HH:mm')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.actor_name || log.actor_email || 'Utilisateur inconnu'}
                    </p>
                    {log.target_label && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{log.target_label}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="border-b border-border/60 pb-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium mt-1">{value || '-'}</p>
    </div>
  );
}

function ExternalButton({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline" className="gap-2">
        <ExternalLink className="h-3.5 w-3.5" />
        {label}
      </Button>
    </a>
  );
}

function MetricCard({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold font-mono mt-0.5 ${highlight ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  );
}
