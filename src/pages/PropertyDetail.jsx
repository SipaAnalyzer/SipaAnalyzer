import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
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
import { createEmptyExcelProjections } from '../components/ExcelProjectionTables';
import CommentSection from '../components/CommentSection';
import FavoriteButton from '../components/FavoriteButton';
import TraceabilityPanel from '../components/TraceabilityPanel';
import { calculateAnalysis, formatCHF, formatPercent, normalizeAnalyses, WORKFLOW_STATUSES } from '../utils/calculations';
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
  const [technicalDraft, setTechnicalDraft] = useState(null);

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
    queryClient.invalidateQueries({ queryKey: ['nav-alert-audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['nav-alert-comments'] });
    queryClient.invalidateQueries({ queryKey: ['alerts-audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['alerts-comments'] });
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

  const updateTechnicalAnalysis = useMutation({
    mutationFn: ({ id, payload }) => base44.entities.Analysis.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', propertyId] });
      refreshAlertBadgeQueries();
      toast.success('Analyse technique enregistrée');
    },
    onError: (error) => {
      console.error('[PropertyDetail] technical analysis update failed:', error);
      toast.error("Impossible d'enregistrer la vue technique");
    },
  });

  const normalizedAnalyses = property ? normalizeAnalyses(analyses, property) : [];
  const latest = normalizedAnalyses[0];
  const selected = selectedAnalysisId
    ? normalizedAnalyses.find((analysis) => analysis.id === selectedAnalysisId) || latest
    : latest;
  const displayedAnalysis = analysisViewMode === 'technical' && technicalDraft?.id === selected?.id
    ? normalizeAnalysisDraft(technicalDraft, property)
    : selected;

  useEffect(() => {
    if (selected?.id) {
      setTechnicalDraft({ ...selected });
    } else {
      setTechnicalDraft(null);
    }
  }, [selected?.id]);

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

  const saveTechnicalDraft = () => {
    if (!technicalDraft?.id) return;
    const normalizedDraft = normalizeAnalysisDraft(technicalDraft, property);
    updateTechnicalAnalysis.mutate({
      id: technicalDraft.id,
      payload: buildTechnicalAnalysisPayload(normalizedDraft),
    });
  };

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

          {displayedAnalysis && <PdfExportDialog onExport={(sections) => exportAnalysisPdf(property, displayedAnalysis, sections)} />}

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
          {displayedAnalysis ? (
            <>
              <AnalysisViewModeToggle value={analysisViewMode} onChange={setAnalysisViewMode} />
              <AnalysisSummary
                property={property}
                selected={displayedAnalysis}
                selectedAnalysisId={selectedAnalysisId}
                canEdit={canEdit}
                canEditAnalysis={canEditAnalysis}
                isUpdatingStatus={updatePropertyStatus.isPending}
                onStatusChange={(status) => updatePropertyStatus.mutate(status)}
              />
              {analysisViewMode === 'simplified' ? (
                <>
                  <FinancialTable analysis={displayedAnalysis} />
                  {displayedAnalysis.sipa_data && displayedAnalysis.sipa_data.filter((e) => !e._custom).length > 0 && (
                    <SipaImportedDataTable analysis={displayedAnalysis} />
                  )}
                </>
              ) : (
                <TechnicalAnalysisSnapshot
                  property={property}
                  analysis={displayedAnalysis}
                  draft={technicalDraft || displayedAnalysis}
                  setDraft={setTechnicalDraft}
                  canEditAnalysis={canEditAnalysis}
                  isSaving={updateTechnicalAnalysis.isPending}
                  onSave={saveTechnicalDraft}
                />
              )}
              
              {analysisViewMode === 'simplified' && <Projection5Ans analysis={displayedAnalysis} />}
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

function TechnicalAnalysisSnapshot({ property, analysis, draft, setDraft, canEditAnalysis, isSaving, onSave }) {
  const prixTotal = Math.round(
    Number(analysis.prix_bien || 0) +
    Number(analysis.versement_initial || 0) +
    Number(analysis.amortissement_5_ans || 0) +
    Number(analysis.honoraires_sipa || 0) +
    Number(analysis.frais_dossier_bancaire || 0)
  );
  const customFields = analysis.sipa_data ? analysis.sipa_data.filter((entry) => entry._custom) : [];
  const visibleCustomFields = customFields
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      const amount = entry.values?.find((value) => value.type === 'amount');
      const pct = entry.values?.find((value) => value.type === 'pct');
      return hasFinancialValue(amount?.value) || hasFinancialValue(pct?.value);
    });
  const canEdit = canEditAnalysis && !!draft;
  const exportBaseName = `${propertySafeName(property?.titre || property?.adresse || property?.ville || 'bien')}-${analysis.created_date ? moment(analysis.created_date).format('YYYY-MM-DD') : 'analyse'}`;
  const financialExportRows = buildFinancialExportRows(analysis, customFields, prixTotal);
  const bankExportRows = buildBankExportRows(analysis);
  const updateDraftField = (key, value) => {
    if (!canEdit) return;
    setDraft((current) => ({ ...(current || analysis), [key]: value }));
  };
  const updatePctField = (amountKey, pctKey, base) => (pct) => {
    if (!canEdit) return;
    setDraft((current) => ({
      ...(current || analysis),
      [amountKey]: pct == null || !base ? null : Math.round(Number(base || 0) * pct / 100),
      [pctKey]: pct,
    }));
  };
  const updateCustomField = (entryIndex, valueType, value) => {
    if (!canEdit) return;
    setDraft((current) => {
      const base = current || analysis;
      const customCursor = { current: -1 };
      const sipaData = (base.sipa_data || []).map((entry) => {
        if (!entry._custom) return entry;
        customCursor.current += 1;
        if (customCursor.current !== entryIndex) return entry;

        const values = [...(entry.values || [])];
        const existingIndex = values.findIndex((item) => item.type === valueType);
        if (existingIndex >= 0) {
          values[existingIndex] = { ...values[existingIndex], value };
        } else {
          values.push({ type: valueType, value });
        }
        return { ...entry, values };
      });
      return { ...base, sipa_data: sipaData };
    });
  };
  const updateSipaImportedCell = (entryIndex, valueIndex, field, value) => {
    if (!canEdit) return;
    setDraft((current) => {
      const base = current || analysis;
      const importedCursor = { current: -1 };
      const sipaData = (base.sipa_data || []).map((entry) => {
        if (entry._custom) return entry;
        importedCursor.current += 1;
        if (importedCursor.current !== entryIndex) return entry;
        if (field === 'label') return { ...entry, label: value };

        const values = (entry.values || []).map((item, index) =>
          index === valueIndex ? { ...item, value } : item
        );
        return { ...entry, values };
      });
      return { ...base, sipa_data: sipaData };
    });
  };
  const updateProjectionCell = (projectionKey, rowIndex, colIndex, value) => {
    if (!canEdit) return;
    setDraft((current) => {
      const base = current || analysis;
      const fallback = createEmptyExcelProjections()[projectionKey];
      const projection = normalizeProjectionDraft(base[projectionKey], fallback);
      const rows = projection.rows.map((row, index) =>
        index === rowIndex
          ? { ...row, values: row.values.map((cell, cellIndex) => (cellIndex === colIndex ? value : cell)) }
          : row
      );
      return { ...base, [projectionKey]: { ...projection, rows } };
    });
  };
  const updateProjectionAssumption = (projectionKey, key, value) => {
    if (!canEdit) return;
    setDraft((current) => {
      const base = current || analysis;
      const fallback = createEmptyExcelProjections()[projectionKey];
      const projection = normalizeProjectionDraft(base[projectionKey], fallback);
      return {
        ...base,
        [projectionKey]: {
          ...projection,
          assumptions: { ...(projection.assumptions || {}), [key]: value },
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <SectionHeading
            title="Vue technique"
            description="Classeur technique de l'analyse selectionnee."
            rows={financialExportRows}
            filename={`${exportBaseName}-vue-technique`}
          />
          {canEditAnalysis && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={onSave} disabled={isSaving}>
                <Pencil className="h-3.5 w-3.5" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Link to={`/edit-analysis/${analysis.id}`}>
                <Button size="sm" variant="ghost" className="gap-2">
                  Edition complète
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
          <table className="w-full min-w-[1040px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
            <thead>
              <tr>
                <ExcelCorner />
                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                  <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>
                ))}
              </tr>
              <tr>
                <ExcelRowNumber>1</ExcelRowNumber>
                <ExcelHeaderCell>Bloc</ExcelHeaderCell>
                <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Montant CHF</ExcelHeaderCell>
                <ExcelHeaderCell align="right">%</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Calcul</ExcelHeaderCell>
              </tr>
            </thead>
            <tbody>
              <ExcelOptionalReadRow row={2} section="Acquisition" label="Prix du bien" amount={analysis.prix_bien} editable={canEdit} onAmountChange={(value) => updateDraftField('prix_bien', value)} />
              <ExcelOptionalReadRow row={3} section="Acquisition" label="Versement initial copropriete" amount={analysis.versement_initial} editable={canEdit} onAmountChange={(value) => updateDraftField('versement_initial', value)} />
              <ExcelOptionalReadRow row={4} section="Acquisition" label="Amortissement sur 5 ans" amount={analysis.amortissement_5_ans} editable={canEdit} onAmountChange={(value) => updateDraftField('amortissement_5_ans', value)} />
              <ExcelOptionalReadRow row={5} section="Acquisition" label="Honoraires transaction SIPA" amount={analysis.honoraires_sipa} pct={percentOf(analysis.honoraires_sipa, analysis.prix_bien)} editable={canEdit} onAmountChange={(value) => updateDraftField('honoraires_sipa', value)} onPctChange={updatePctField('honoraires_sipa', 'honoraires_sipa_pct', analysis.prix_bien)} />
              <ExcelOptionalReadRow row={6} section="Acquisition" label="Frais de dossier bancaire" amount={analysis.frais_dossier_bancaire} editable={canEdit} onAmountChange={(value) => updateDraftField('frais_dossier_bancaire', value)} />
              <ExcelComputedRow row={7} section="Acquisition" label="Prix total" value={formatCHF(prixTotal)} strong />
              <ExcelOptionalReadRow row={8} section="Financement" label="Fonds propres" amount={analysis.fonds_propres} editable={canEdit} onAmountChange={(value) => updateDraftField('fonds_propres', value)} />
              <ExcelOptionalReadRow row={9} section="Financement" label="Hypotheque" amount={analysis.hypotheque} pct={percentOf(analysis.hypotheque, prixTotal)} editable={canEdit} onAmountChange={(value) => updateDraftField('hypotheque', value)} onPctChange={updatePctField('hypotheque', 'hypotheque_pct', prixTotal)} />
              <ExcelOptionalReadRow row={10} section="Exploitation" label="Revenus locatifs hors charges" amount={analysis.revenus_locatifs} editable={canEdit} onAmountChange={(value) => updateDraftField('revenus_locatifs', value)} />
              <ExcelComputedRow row={11} section="Exploitation" label="Taux de rendement brut" value={formatPercent(analysis.rendement_brut)} />
              <ExcelOptionalReadRow row={12} section="Exploitation" label="Charges operationnelles" amount={analysis.charges_operationnelles} editable={canEdit} onAmountChange={(value) => updateDraftField('charges_operationnelles', value)} />
              <ExcelOptionalReadRow row={13} section="Exploitation" label="Interet hypothecaire moyen 5 ans" amount={analysis.interets_hypothecaires} pct={percentOf(analysis.interets_hypothecaires, analysis.hypotheque)} editable={canEdit} onAmountChange={(value) => updateDraftField('interets_hypothecaires', value)} onPctChange={updatePctField('interets_hypothecaires', 'interets_hypothecaires_pct', analysis.hypotheque)} />
              <ExcelOptionalReadRow row={14} section="Exploitation" label="Honoraires de gestion" amount={analysis.gestion} pct={percentOf(analysis.gestion, analysis.revenus_locatifs)} editable={canEdit} onAmountChange={(value) => updateDraftField('gestion', value)} onPctChange={updatePctField('gestion', 'gestion_pct', analysis.revenus_locatifs)} />
              <ExcelComputedRow row={15} section="Exploitation" label="Revenu net" value={formatCHF(analysis.revenu_net)} strong />
              <ExcelComputedRow row={16} section="Exploitation" label="Rendement net sur fonds propres" value={formatPercent(analysis.rendement_net_fonds_propres)} />
              <ExcelOptionalReadRow row={17} section="Fiscalite" label="Impot" amount={analysis.impot} pct={percentOf(analysis.impot, analysis.revenu_net)} editable={canEdit} onAmountChange={(value) => updateDraftField('impot', value)} onPctChange={updatePctField('impot', 'impot_pct', analysis.revenu_net)} />
              <ExcelComputedRow row={18} section="Distribution" label="Revenu distribue" value={formatCHF(analysis.revenu_distribue)} strong />
              <ExcelComputedRow row={19} section="Distribution" label="Revenu distribue / fonds propres" value={formatPercent(analysis.revenu_distribue_fonds_propres)} />
              {visibleCustomFields.map(({ entry, index }, visibleIndex) => {
                const amount = entry.values?.find((value) => value.type === 'amount');
                const pct = entry.values?.find((value) => value.type === 'pct');
                return (
                  <ExcelReadRow
                    key={`${entry.label}-${index}`}
                    row={20 + visibleIndex}
                    section="Personnalise"
                    label={entry.label}
                    amount={amount?.value}
                    pct={pct?.value}
                    editable={canEdit}
                    onAmountChange={(value) => updateCustomField(index, 'amount', value ?? 0)}
                    onPctChange={(value) => updateCustomField(index, 'pct', value)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-4">
        <SectionHeading
          title="Hypotheses bancaires techniques"
          rows={bankExportRows}
          filename={`${exportBaseName}-hypotheses-bancaires`}
          className="mb-5"
        />
        <div className="overflow-x-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
          <table className="w-full min-w-[860px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
            <thead>
              <tr>
                <ExcelCorner />
                {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
                  <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>
                ))}
              </tr>
              <tr>
                <ExcelRowNumber>1</ExcelRowNumber>
                <ExcelHeaderCell>Banque</ExcelHeaderCell>
                <ExcelHeaderCell>Type de taux</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Taux base</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Marge SARON</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Amortissement</ExcelHeaderCell>
                <ExcelHeaderCell>Evaluation</ExcelHeaderCell>
              </tr>
            </thead>
            <tbody>
              <ExcelBankSnapshot row={2} title="Banque A" analysis={analysis} prefix="banque_a" editable={canEdit} onChange={updateDraftField} />
              <ExcelBankSnapshot row={3} title="Banque B" analysis={analysis} prefix="banque_b" editable={canEdit} onChange={updateDraftField} />
            </tbody>
          </table>
        </div>
      </section>

      {analysis.sipa_data && analysis.sipa_data.filter((entry) => !entry._custom).length > 0 && (
        <ExcelSipaInvestmentSheet
          analysis={analysis}
          editable={canEdit}
          onCellChange={updateSipaImportedCell}
          exportBaseName={exportBaseName}
        />
      )}

      <ExcelProjectionSheet
        title="Projection exploitation"
        projection={normalizeProjectionDraft(analysis.operating_projection, createEmptyExcelProjections().operating_projection)}
        editable={canEdit}
        onCellChange={(rowIndex, colIndex, value) => updateProjectionCell('operating_projection', rowIndex, colIndex, value)}
        exportBaseName={exportBaseName}
        exportSlug="projection-exploitation"
      />

      <ExcelProjectionSheet
        title="Dette, valeur et rendement"
        projection={normalizeProjectionDraft(analysis.capital_projection, createEmptyExcelProjections().capital_projection)}
        editable={canEdit}
        onCellChange={(rowIndex, colIndex, value) => updateProjectionCell('capital_projection', rowIndex, colIndex, value)}
        onAssumptionChange={(key, value) => updateProjectionAssumption('capital_projection', key, value)}
        exportBaseName={exportBaseName}
        exportSlug="dette-valeur-rendement"
      />
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

function SectionHeading({ title, description, rows, filename, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div>
        <h3 className="font-heading font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <TableExportButtons rows={rows} filename={filename} />
    </div>
  );
}

function TableExportButtons({ rows, filename }) {
  if (!rows?.length) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 px-2 text-[11px]"
        onClick={() => downloadRowsAsCsv(rows, filename)}
      >
        <Download className="h-3 w-3" />
        CSV
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 px-2 text-[11px]"
        onClick={() => downloadRowsAsXlsx(rows, filename)}
      >
        <Download className="h-3 w-3" />
        Excel
      </Button>
    </div>
  );
}

function ExcelSipaInvestmentSheet({ analysis, editable, onCellChange, exportBaseName }) {
  const rows = analysis.sipa_data.filter((entry) => !entry._custom);
  const maxValues = Math.max(1, ...rows.map((entry) => entry.values?.length || 0));
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, maxValues + 1);
  const exportRows = buildSipaExportRows(rows, maxValues);

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <SectionHeading
        title="Investissement SIPA"
        rows={exportRows}
        filename={`${exportBaseName}-investissement-sipa`}
        className="mb-5"
      />
      <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
        <table className="w-full min-w-[760px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
          <thead>
            <tr>
              <ExcelCorner />
              {letters.map((letter) => <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>)}
            </tr>
            <tr>
              <ExcelRowNumber>1</ExcelRowNumber>
              <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
              {Array.from({ length: maxValues }, (_, index) => (
                <ExcelHeaderCell key={index} align="right">Valeur {index + 1}</ExcelHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, rowIndex) => (
              <tr key={`${entry.label}-${rowIndex}`} className="hover:bg-[#fff2cc]">
                <ExcelRowNumber>{rowIndex + 2}</ExcelRowNumber>
                <ExcelCell className={editable ? 'p-0' : ''}>
                  {editable ? (
                    <input
                      type="text"
                      value={entry.label || ''}
                      onChange={(event) => onCellChange(rowIndex, null, 'label', event.target.value)}
                      className="h-6 w-full bg-transparent px-2 text-black outline-none focus:bg-[#fff2cc]"
                    />
                  ) : (
                    entry.label
                  )}
                </ExcelCell>
                {Array.from({ length: maxValues }, (_, valueIndex) => {
                  const value = entry.values?.[valueIndex];
                  const isNumeric = value?.type === 'amount' || value?.type === 'pct' || typeof value?.value === 'number';
                  return (
                    <ExcelCell key={valueIndex} align={isNumeric ? 'right' : 'left'} className={editable && value ? 'p-0' : ''}>
                      {editable && value ? (
                        isNumeric ? (
                          <ExcelNumberInput value={value.value} onChange={(next) => onCellChange(rowIndex, valueIndex, 'value', next)} />
                        ) : (
                          <input
                            type="text"
                            value={value.value ?? ''}
                            onChange={(event) => onCellChange(rowIndex, valueIndex, 'value', event.target.value)}
                            className="h-6 w-full bg-transparent px-2 text-black outline-none focus:bg-[#fff2cc]"
                          />
                        )
                      ) : (
                        value ? formatSipaValue(value) : ''
                      )}
                    </ExcelCell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExcelProjectionSheet({ title, projection, editable, onCellChange, onAssumptionChange, exportBaseName, exportSlug }) {
  if (!projection?.rows?.length) return null;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].slice(0, projection.columns.length + 1);
  const hasAssumptions = projection.assumptions && Object.keys(projection.assumptions).length > 0;
  const exportRows = buildProjectionExportRows(projection);

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <SectionHeading
        title={title}
        rows={exportRows}
        filename={`${exportBaseName}-${exportSlug || propertySafeName(title)}`}
        className="mb-5"
      />
      <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
        <table className="w-full min-w-[860px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
          <thead>
            <tr>
              <ExcelCorner />
              {letters.map((letter) => <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>)}
            </tr>
            <tr>
              <ExcelRowNumber>1</ExcelRowNumber>
              <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
              {projection.columns.map((column) => (
                <ExcelHeaderCell key={column} align="right">{column}</ExcelHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row, rowIndex) => (
              <tr key={row.key || row.label} className="hover:bg-[#fff2cc]">
                <ExcelRowNumber>{rowIndex + 2}</ExcelRowNumber>
                <ExcelCell>{row.label}</ExcelCell>
                {projection.columns.map((column, colIndex) => (
                  <ExcelCell key={`${row.key}-${column}`} align="right" className={editable ? 'p-0' : ''}>
                    {editable ? (
                      <ExcelNumberInput
                        value={row.values?.[colIndex]}
                        onChange={(value) => onCellChange(rowIndex, colIndex, value)}
                      />
                    ) : (
                      formatProjectionValue(row.values?.[colIndex], row.type)
                    )}
                  </ExcelCell>
                ))}
              </tr>
            ))}
            {hasAssumptions && (
              <>
                <tr>
                  <ExcelRowNumber>{projection.rows.length + 2}</ExcelRowNumber>
                  <ExcelCell className="bg-[#e2f0d9] font-bold">Hypotheses</ExcelCell>
                  {projection.columns.map((column) => <ExcelCell key={column} className="bg-[#e2f0d9]" />)}
                </tr>
                {Object.entries(projection.assumptions).map(([key, value], index) => (
                  <tr key={key} className="hover:bg-[#fff2cc]">
                    <ExcelRowNumber>{projection.rows.length + 3 + index}</ExcelRowNumber>
                    <ExcelCell>{formatAssumptionLabel(key)}</ExcelCell>
                    <ExcelCell align="right" className={editable ? 'p-0' : ''}>
                      {editable ? (
                        <ExcelNumberInput value={value} onChange={(next) => onAssumptionChange?.(key, next)} />
                      ) : (
                        formatProjectionValue(value, key.includes('yield') || key.includes('irr') || key.includes('increase') ? 'percent' : 'amount')
                      )}
                    </ExcelCell>
                    {projection.columns.slice(1).map((column) => <ExcelCell key={column} />)}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExcelCorner() {
  return (
    <th className="sticky left-0 z-10 h-6 w-10 border-b border-r border-[#d9d9d9] bg-[#f3f3f3] text-center text-[10px] font-normal text-[#666]">
      #
    </th>
  );
}

function ExcelColumnHeader({ children }) {
  return (
    <th className="h-6 border-b border-r border-[#d9d9d9] bg-[#f3f3f3] px-3 text-center text-[10px] font-normal text-[#666] last:border-r-0">
      {children}
    </th>
  );
}

function ExcelRowNumber({ children }) {
  return (
    <td className="sticky left-0 z-10 h-6 w-10 border-b border-r border-[#d9d9d9] bg-[#f3f3f3] text-center text-[10px] text-[#666]">
      {children}
    </td>
  );
}

function ExcelHeaderCell({ children, align = 'left' }) {
  return (
    <th className={`h-6 border-b border-r border-[#d9d9d9] bg-white px-2 ${align === 'right' ? 'text-right' : 'text-left'} text-[11px] font-bold text-black last:border-r-0`}>
      {children}
    </th>
  );
}

function ExcelCell({ children, align = 'left', className = '' }) {
  return (
    <td className={`h-6 border-b border-r border-[#d9d9d9] bg-white px-2 ${align === 'right' ? 'text-right' : 'text-left'} last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}

function ExcelReadRow({ row, section, label, amount, pct, editable = false, onAmountChange, onPctChange }) {
  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className="font-normal text-black">{section}</ExcelCell>
      <ExcelCell>{label}</ExcelCell>
      <ExcelCell align="right" className={editable ? 'p-0' : ''}>
        {editable ? (
          <ExcelNumberInput value={amount} onChange={onAmountChange} suffix=" CHF" />
        ) : (
          formatCHF(amount)
        )}
      </ExcelCell>
      <ExcelCell align="right" className={editable && onPctChange ? 'p-0' : ''}>
        {editable && onPctChange ? (
          <ExcelNumberInput value={pct} onChange={onPctChange} suffix=" %" />
        ) : (
          pct == null ? '-' : formatPercent(pct)
        )}
      </ExcelCell>
      <ExcelCell className="bg-white text-black" />
    </tr>
  );
}

function ExcelOptionalReadRow({ amount, pct, ...props }) {
  if (!hasFinancialValue(amount) && !hasFinancialValue(pct)) return null;
  return <ExcelReadRow amount={amount} pct={pct} {...props} />;
}

function hasFinancialValue(value) {
  if (value === null || value === undefined || value === '') return false;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return Boolean(String(value).trim());
  return numeric !== 0;
}

function ExcelComputedRow({ row, section, label, value, formula, strong = false }) {
  return (
    <tr className={strong ? 'hover:bg-[#fff2cc]' : 'hover:bg-[#fff2cc]'}>
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className="font-normal text-black">{section}</ExcelCell>
      <ExcelCell className={strong ? 'bg-[#e2f0d9] font-bold text-black' : 'bg-white text-black'}>{label}</ExcelCell>
      <ExcelCell className="bg-white" />
      <ExcelCell className="bg-white" />
      <ExcelCell align="right" className={`${strong ? 'bg-[#e2f0d9] font-bold text-black' : 'bg-white text-black'}`}>
        {value}
        {formula && <span className="ml-2 text-[10px] text-[#666]">{formula}</span>}
      </ExcelCell>
    </tr>
  );
}

function ExcelBankSnapshot({ row, title, analysis, prefix, editable = false, onChange }) {
  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className="font-normal text-black">{title}</ExcelCell>
      <ExcelCell className={editable ? 'p-0' : ''}>
        {editable ? (
          <select
            value={analysis[`${prefix}_type_taux`] || 'fixe'}
            onChange={(event) => onChange(`${prefix}_type_taux`, event.target.value)}
            className="h-6 w-full bg-transparent px-2 text-black outline-none focus:bg-[#fff2cc]"
          >
            <option value="fixe">Fixe</option>
            <option value="saron">Variable full SARON</option>
            <option value="mixte">Variable base fixe + SARON</option>
          </select>
        ) : (
          analysis[`${prefix}_type_taux`] || 'fixe'
        )}
      </ExcelCell>
      <ExcelCell align="right" className={editable ? 'p-0' : ''}>
        {editable ? <ExcelNumberInput value={analysis[`${prefix}_taux_hypothecaire`]} onChange={(value) => onChange(`${prefix}_taux_hypothecaire`, value)} suffix=" %" /> : formatPercent(analysis[`${prefix}_taux_hypothecaire`])}
      </ExcelCell>
      <ExcelCell align="right" className={editable ? 'p-0' : ''}>
        {editable ? <ExcelNumberInput value={analysis[`${prefix}_marge_saron`]} onChange={(value) => onChange(`${prefix}_marge_saron`, value)} suffix=" %" /> : formatPercent(analysis[`${prefix}_marge_saron`])}
      </ExcelCell>
      <ExcelCell align="right" className={editable ? 'p-0' : ''}>
        {editable ? <ExcelNumberInput value={analysis[`${prefix}_amortissement_annuel`]} onChange={(value) => onChange(`${prefix}_amortissement_annuel`, value)} suffix=" CHF" /> : formatCHF(analysis[`${prefix}_amortissement_annuel`])}
      </ExcelCell>
      <ExcelCell className={editable ? 'p-0' : ''}>
        {editable ? (
          <input
            type="text"
            value={analysis[`${prefix}_evaluation`] || ''}
            onChange={(event) => onChange(`${prefix}_evaluation`, event.target.value)}
            className="h-6 w-full bg-transparent px-2 text-black outline-none focus:bg-[#fff2cc]"
          />
        ) : (
          analysis[`${prefix}_evaluation`] || '-'
        )}
      </ExcelCell>
    </tr>
  );
}

function ExcelNumberInput({ value, onChange, suffix = '' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value === '' ? null : parseFloat(event.target.value) || 0)}
      className="h-6 w-full bg-transparent px-2 text-right text-black outline-none focus:bg-[#fff2cc]"
      title={suffix ? `Valeur${suffix}` : 'Valeur'}
    />
  );
}

function buildFinancialExportRows(analysis, customFields, prixTotal) {
  const header = ['Bloc', 'Rubrique', 'Montant CHF', '%', 'Calcul'];
  const rows = [
    ['Acquisition', 'Prix du bien', analysis.prix_bien ?? '', '', ''],
    ['Acquisition', 'Versement initial copropriete', analysis.versement_initial ?? '', '', ''],
    ['Acquisition', 'Amortissement sur 5 ans', analysis.amortissement_5_ans ?? '', '', ''],
    ['Acquisition', 'Honoraires transaction SIPA', analysis.honoraires_sipa ?? '', percentOf(analysis.honoraires_sipa, analysis.prix_bien) ?? '', ''],
    ['Acquisition', 'Frais de dossier bancaire', analysis.frais_dossier_bancaire ?? '', '', ''],
    ['Acquisition', 'Prix total', '', '', prixTotal ?? ''],
    ['Financement', 'Fonds propres', analysis.fonds_propres ?? '', '', ''],
    ['Financement', 'Hypotheque', analysis.hypotheque ?? '', percentOf(analysis.hypotheque, prixTotal) ?? '', ''],
    ['Exploitation', 'Revenus locatifs hors charges', analysis.revenus_locatifs ?? '', '', ''],
    ['Exploitation', 'Taux de rendement brut', '', '', analysis.rendement_brut ?? ''],
    ['Exploitation', 'Charges operationnelles', analysis.charges_operationnelles ?? '', '', ''],
    ['Exploitation', 'Interet hypothecaire moyen 5 ans', analysis.interets_hypothecaires ?? '', percentOf(analysis.interets_hypothecaires, analysis.hypotheque) ?? '', ''],
    ['Exploitation', 'Honoraires de gestion', analysis.gestion ?? '', percentOf(analysis.gestion, analysis.revenus_locatifs) ?? '', ''],
    ['Exploitation', 'Revenu net', '', '', analysis.revenu_net ?? ''],
    ['Exploitation', 'Rendement net sur fonds propres', '', '', analysis.rendement_net_fonds_propres ?? ''],
    ['Fiscalite', 'Impot', analysis.impot ?? '', percentOf(analysis.impot, analysis.revenu_net) ?? '', ''],
    ['Distribution', 'Revenu distribue', '', '', analysis.revenu_distribue ?? ''],
    ['Distribution', 'Revenu distribue / fonds propres', '', '', analysis.revenu_distribue_fonds_propres ?? ''],
  ];

  customFields.forEach((entry) => {
    const amount = entry.values?.find((value) => value.type === 'amount');
    const pct = entry.values?.find((value) => value.type === 'pct');
    rows.push(['Personnalise', entry.label || '', amount?.value ?? '', pct?.value ?? '', '']);
  });

  return [
    header,
    ...rows.filter((row) => {
      const hasComputedValue = hasFinancialValue(row[4]);
      if (hasComputedValue) return true;
      return hasFinancialValue(row[2]) || hasFinancialValue(row[3]);
    }),
  ];
}

function buildBankExportRows(analysis) {
  return [
    ['Banque', 'Type de taux', 'Taux base', 'Marge SARON', 'Amortissement', 'Evaluation'],
    ['Banque A', analysis.banque_a_type_taux || 'fixe', analysis.banque_a_taux_hypothecaire ?? '', analysis.banque_a_marge_saron ?? '', analysis.banque_a_amortissement_annuel ?? '', analysis.banque_a_evaluation || ''],
    ['Banque B', analysis.banque_b_type_taux || 'fixe', analysis.banque_b_taux_hypothecaire ?? '', analysis.banque_b_marge_saron ?? '', analysis.banque_b_amortissement_annuel ?? '', analysis.banque_b_evaluation || ''],
  ];
}

function buildSipaExportRows(rows, maxValues) {
  return [
    ['Rubrique', ...Array.from({ length: maxValues }, (_, index) => `Valeur ${index + 1}`)],
    ...rows.map((entry) => [
      entry.label || '',
      ...Array.from({ length: maxValues }, (_, index) => entry.values?.[index]?.value ?? ''),
    ]),
  ];
}

function buildProjectionExportRows(projection) {
  const rows = [
    ['Rubrique', ...(projection.columns || [])],
    ...(projection.rows || []).map((row) => [row.label || '', ...(row.values || [])]),
  ];

  if (projection.assumptions && Object.keys(projection.assumptions).length > 0) {
    rows.push([]);
    rows.push(['Hypotheses', 'Valeur']);
    Object.entries(projection.assumptions).forEach(([key, value]) => {
      rows.push([formatAssumptionLabel(key), value ?? '']);
    });
  }

  return rows;
}

function downloadRowsAsCsv(rows, filename) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
  downloadBlob(`${propertySafeName(filename)}.csv`, `\ufeffsep=;\r\n${csv}`, 'text/csv;charset=utf-8');
}

function downloadRowsAsXlsx(rows, filename) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = buildExcelColumnWidths(rows);
  worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: Math.max((rows[0]?.length || 1) - 1, 0) } }) };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  XLSX.writeFile(workbook, `${propertySafeName(filename)}.xlsx`);
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildExcelColumnWidths(rows) {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row[columnIndex];
      return Math.max(max, value === null || value === undefined ? 0 : String(value).length);
    }, 8);
    return { wch: Math.min(Math.max(maxLength + 2, columnIndex === 1 ? 28 : 12), 42) };
  });
}

function propertySafeName(value) {
  return String(value || 'export')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeAnalysisDraft(draft, property) {
  if (!draft) return null;

  const prixTotal = Math.round(
    Number(draft.prix_bien || 0) +
    Number(draft.versement_initial || 0) +
    Number(draft.amortissement_5_ans || 0) +
    Number(draft.honoraires_sipa || 0) +
    Number(draft.frais_dossier_bancaire || 0)
  );
  const calc = calculateAnalysis({
    ...draft,
    ville: property?.ville,
    canton: property?.canton,
    surface: property?.surface,
    annee_construction: property?.annee_construction,
  });

  return {
    ...draft,
    prix_total: prixTotal,
    rendement_brut: calc.rendement_brut,
    revenu_net: calc.revenu_net,
    rendement_net_fonds_propres: calc.rendement_net_fonds_propres,
    revenu_distribue: calc.revenu_distribue,
    revenu_distribue_fonds_propres: calc.revenu_distribue_fonds_propres,
    score_global: calc.score_global,
    note: calc.note,
    score_emplacement: calc.score_emplacement,
    prix_m2_bien: calc.prix_m2_bien,
    prix_m2_marche: calc.prix_m2_marche,
    ecart_prix_m2_marche: calc.ecart_prix_m2_marche,
    impact_score_prix_m2: calc.impact_score_prix_m2,
  };
}

function buildTechnicalAnalysisPayload(analysis) {
  return {
    statut: analysis.statut,
    sipa_data: analysis.sipa_data || null,
    prix_bien: analysis.prix_bien,
    versement_initial: analysis.versement_initial,
    amortissement_5_ans: analysis.amortissement_5_ans,
    honoraires_sipa: analysis.honoraires_sipa,
    frais_dossier_bancaire: analysis.frais_dossier_bancaire,
    fonds_propres: analysis.fonds_propres,
    hypotheque: analysis.hypotheque,
    revenus_locatifs: analysis.revenus_locatifs,
    charges_operationnelles: analysis.charges_operationnelles,
    interets_hypothecaires: analysis.interets_hypothecaires,
    gestion: analysis.gestion,
    impot: analysis.impot,
    notes: analysis.notes || null,
    banque_a_taux_hypothecaire: analysis.banque_a_taux_hypothecaire,
    banque_a_type_taux: analysis.banque_a_type_taux,
    banque_a_marge_saron: analysis.banque_a_marge_saron,
    banque_a_amortissement_annuel: analysis.banque_a_amortissement_annuel,
    banque_a_evaluation: analysis.banque_a_evaluation,
    banque_b_taux_hypothecaire: analysis.banque_b_taux_hypothecaire,
    banque_b_type_taux: analysis.banque_b_type_taux,
    banque_b_marge_saron: analysis.banque_b_marge_saron,
    banque_b_amortissement_annuel: analysis.banque_b_amortissement_annuel,
    banque_b_evaluation: analysis.banque_b_evaluation,
    operating_projection: analysis.operating_projection,
    capital_projection: analysis.capital_projection,
    prix_total: analysis.prix_total,
    rendement_brut: analysis.rendement_brut,
    revenu_net: analysis.revenu_net,
    rendement_net_fonds_propres: analysis.rendement_net_fonds_propres,
    revenu_distribue: analysis.revenu_distribue,
    revenu_distribue_fonds_propres: analysis.revenu_distribue_fonds_propres,
    score_global: analysis.score_global,
    note: analysis.note,
  };
}

function normalizeProjectionDraft(projection, fallback) {
  const source = projection && typeof projection === 'object' ? projection : fallback;
  const sourceRows = Array.isArray(source.rows) ? source.rows : [];

  return {
    ...fallback,
    ...source,
    columns: Array.isArray(source.columns) && source.columns.length ? source.columns : fallback.columns,
    rows: fallback.rows.map((fallbackRow) => {
      const existing = sourceRows.find((row) => row.key === fallbackRow.key || row.label === fallbackRow.label);
      const values = Array.isArray(existing?.values) ? existing.values : [];
      return {
        ...fallbackRow,
        ...existing,
        values: Array.from(
          { length: fallback.columns.length },
          (_, index) => values[index] ?? null
        ),
      };
    }),
    assumptions: {
      ...(fallback.assumptions || {}),
      ...(source.assumptions || {}),
    },
  };
}

function formatProjectionValue(value, type) {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'percent') return formatPercent(value);
  return formatCHF(value);
}

function formatAssumptionLabel(key) {
  const labels = {
    price_increase: 'Price increase',
    sales_price: 'Sales price',
    exit_debt: 'Debt sortie',
    net: 'Net',
    irr: 'IRR',
    average_dividend_yield: 'Dividend Yield moyen',
  };
  return labels[key] || key;
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

function AnalysisSummary({ property, selected, selectedAnalysisId, canEdit, canEditAnalysis, isUpdatingStatus, onStatusChange }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {canEditAnalysis && selected?.id && (
        <div className="mb-5 flex justify-end">
          <Link to={`/edit-analysis/${selected.id}`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Modifier l'analyse
            </Button>
          </Link>
        </div>
      )}

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
          status={property?.statut || 'en_cours'}
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
          <MetricCard label="Prix / m²" value={selected.prix_m2_bien ? formatCHF(selected.prix_m2_bien) : 'Surface manquante'} />
          <MetricCard label="Marché zone" value={selected.prix_m2_marche ? formatCHF(selected.prix_m2_marche) : 'Référence indisponible'} />
          <MetricCard
            label="Écart marché"
            value={selected.ecart_prix_m2_marche != null ? `${selected.ecart_prix_m2_marche > 0 ? '+' : ''}${selected.ecart_prix_m2_marche}%` : 'N/A'}
            highlight={selected.ecart_prix_m2_marche != null && selected.ecart_prix_m2_marche <= 0}
          />
          <MetricCard
            label="Impact zone"
            value={`${selected.impact_score_prix_m2 > 0 ? '+' : ''}${selected.impact_score_prix_m2 || 0} pt`}
            highlight={selected.impact_score_prix_m2 > 0}
          />
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
