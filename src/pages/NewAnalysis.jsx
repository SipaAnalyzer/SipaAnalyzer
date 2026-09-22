import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import AnalysisForm from '../components/AnalysisForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { readEstimationDraft, writeEstimationDraft } from '@/utils/estimationDraft';

export default function NewAnalysis() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId') || '';
  const fromEstimation = params.get('source') === 'estimation';
  return <NewAnalysisForm key={`${user?.id}-${propertyId}-${fromEstimation}`} userId={user?.id} propertyId={propertyId} fromEstimation={fromEstimation} />;
}

function NewAnalysisForm({ userId, propertyId, fromEstimation }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permissions, isAdmin } = usePermissions();
  const canCreate = isAdmin || permissions.can_create_analysis;
  const [draft] = useState(() => {
    if (!fromEstimation || !propertyId) return null;
    const saved = readEstimationDraft(userId, propertyId);
    return saved?.property?.id === propertyId && saved?.initialData?.property_id === propertyId ? saved : null;
  });
  const [savedAnalysisId, setSavedAnalysisId] = useState(draft?.analysisId || null);
  const saveDraft = useCallback((data) => {
    if (!draft) return;
    const current = readEstimationDraft(userId, propertyId) || draft;
    if (current.analysisId) return;
    writeEstimationDraft(userId, { ...current, initialData: data }, propertyId);
  }, [userId, propertyId, draft]);

  const create = useMutation({
    mutationFn: (data) => {
      if (fromEstimation && (!canCreate || !draft || readEstimationDraft(userId, propertyId)?.analysisId)) {
        throw new Error('Cette analyse ne peut pas être créée. Revenez à votre estimation.');
      }
      return base44.entities.Analysis.create(draft ? { ...data, property_id: propertyId } : data);
    },
    onSuccess: (result) => {
      if (draft) {
        const current = readEstimationDraft(userId, propertyId) || draft;
        writeEstimationDraft(userId, { ...current, analysisId: result.id }, propertyId);
        setSavedAnalysisId(result.id);
      }
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['nav-alert-analyses'] });
      toast.success('Analyse enregistrée avec succès');
      recordAuditLog({ eventType: 'analysis_created', targetType: 'analysis', targetId: result.id, targetLabel: `Analyse #${result.id?.slice(0, 8)}`, metadata: { property_id: result.property_id } });
      navigate(`/property/${result.property_id}`);
    },
    onError: (error) => {
      console.error('[NewAnalysis] save failed:', error);
      toast.error(error?.message || "Impossible d'enregistrer l'analyse");
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={fromEstimation ? '/test-estimation' : '/properties'} aria-label={fromEstimation ? 'Retour à l’estimation' : 'Retour aux biens'}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Nouvelle analyse</h1>
          <p className="text-sm text-muted-foreground">Saisissez les données financières pour obtenir une évaluation complète</p>
        </div>
      </div>
      {fromEstimation && !draft ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-6">
          <p>Le brouillon de cette estimation n’est plus disponible dans cet onglet.</p>
          <Button asChild variant="outline"><Link to="/test-estimation">Retour à Test estimation</Link></Button>
        </div>
      ) : savedAnalysisId ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-6">
          <p>L’analyse de ce bien a déjà été enregistrée.</p>
          <Button asChild><Link to={`/analysis/${savedAnalysisId}`}>Voir l’analyse</Link></Button>
        </div>
      ) : fromEstimation && !canCreate ? (
        <p className="text-sm text-muted-foreground">Vous n’avez pas l’autorisation de créer une analyse.</p>
      ) : (
        <>
          {draft && (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p><strong>{draft.property.nom_bien} — {draft.property.ville}</strong> : bien créé à partir de votre estimation.</p>
              <p>Le prix, les loyers annuels et les charges sont préremplis. Complétez le financement et les autres postes avant d’enregistrer l’analyse.</p>
              {draft.mode === 'price' && <p className="text-muted-foreground">Le prix repris est un prix cible calculé, à confirmer avec le vendeur.</p>}
            </div>
          )}
          <AnalysisForm initialPropertyId={propertyId} initialData={draft?.initialData}
            fixedProperty={draft?.property} onDraftChange={draft ? saveDraft : undefined}
            onSubmit={create.mutateAsync} isSubmitting={create.isPending} />
        </>
      )}
    </div>
  );
}
