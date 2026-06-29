import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScoreGauge from '../components/ScoreGauge';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import Projection5Ans from '../components/Projection5Ans';
import CommentSection from '../components/CommentSection';
import FavoriteButton from '../components/FavoriteButton';
import TraceabilityPanel from '../components/TraceabilityPanel';
import ChatBot from '../components/ChatBot';
import { formatCHF, formatPercent, normalizeAnalyses } from '../utils/calculations';
import { exportAnalysisPdf, exportPropertyPdf } from '../utils/pdfExports';
import PdfExportDialog from '../components/PdfExportDialog';
import { listAuditLogs } from '../utils/auditLogs';
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

  const deleteProperty = useMutation({
    mutationFn: () => base44.entities.Property.delete(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate('/properties');
    },
  });

  const deleteAnalysis = useMutation({
    mutationFn: (id) => base44.entities.Analysis.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', propertyId] });
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

  const normalizedAnalyses = normalizeAnalyses(analyses);
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

        <div className="flex flex-wrap gap-2">
          <FavoriteButton propertyId={propertyId} variant="outline" className="h-8 w-8" />

          <Button size="sm" variant="outline" className="gap-2" onClick={() => exportPropertyPdf(property, normalizedAnalyses)}>
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
          <PropertyPresentation property={property} latest={latest} />
        </TabsContent>

        <TabsContent value="analyse" className="mt-5 space-y-6">
          {selected ? (
            <>
              <AnalysisSummary selected={selected} selectedAnalysisId={selectedAnalysisId} />
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
          <TraceabilityPanel
            property={property}
            analyses={normalizedAnalyses}
            comments={comments}
            userName={user?.full_name || user?.email}
          />
          <ActivityFeed propertyId={propertyId} />
          <CommentSection propertyId={propertyId} initialComments={comments} />
        </TabsContent>
      </Tabs>

      <ChatBot property={property} analysis={selected} />
    </div>
  );
}

function PropertyPresentation({ property, latest }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold">Présentation du bien</h2>
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

            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Prix total" value={formatCHF(latest.prix_total)} />
              <MetricCard label="Rdt. brut" value={formatPercent(latest.rendement_brut)} />
              <MetricCard label="Revenu net" value={formatCHF(latest.revenu_net)} />
              <MetricCard label="Rdt. net / FP" value={formatPercent(latest.rendement_net_fonds_propres)} highlight />
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
    </div>
  );
}

function AnalysisSummary({ selected, selectedAnalysisId }) {
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
