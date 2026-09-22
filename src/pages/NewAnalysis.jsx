import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import AnalysisForm from '../components/AnalysisForm';
import AnalysisEssentials from '../components/AnalysisEssentials';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { readEstimationDraft, resolveEstimationAnalysisDraft, writeEstimationDraft } from '@/utils/estimationDraft';
import { useQuery } from '@tanstack/react-query';

export default function NewAnalysis() {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId') || '';
  const fromEstimation = params.get('source') === 'estimation';
  return <NewAnalysisForm key={`${user?.id}-${propertyId}-${fromEstimation}`} userId={user?.id} propertyId={propertyId} fromEstimation={fromEstimation} navigationDraft={location.state?.estimationDraft} />;
}

function NewAnalysisForm({ userId, propertyId, fromEstimation, navigationDraft }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permissions, isAdmin } = usePermissions();
  const canCreate = isAdmin || permissions.can_create_analysis;
  const [draft] = useState(() => {
    const saved = resolveEstimationAnalysisDraft(userId, propertyId, navigationDraft);
    // Ordinary new-analysis links can resume an unfinished estimate for the same property.
    return saved && (fromEstimation || !saved.analysisId) ? saved : null;
  });
  const isEstimation = fromEstimation || !!draft;
  const [savedAnalysisId, setSavedAnalysisId] = useState(draft?.analysisId || null);
  const saveDraft = useCallback((data) => {
    if (!draft) return;
    const current = readEstimationDraft(userId, propertyId) || draft;
    if (current.analysisId) return;
    writeEstimationDraft(userId, { ...current, initialData: data }, propertyId);
  }, [userId, propertyId, draft]);

  const create = useMutation({
    mutationFn: (data) => {
      if (isEstimation && (!canCreate || !draft || readEstimationDraft(userId, propertyId)?.analysisId)) {
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

const handlePropertyChange = (id) => {
    const saved = resolveEstimationAnalysisDraft(userId, id);
    if (saved && !saved.analysisId) {
      navigate(`/new-analysis?propertyId=${encodeURIComponent(id)}&source=estimation`, {
        state: { estimationDraft: { ...saved, userId } },
      });
    }
  };

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.Property.get(propertyId),
    enabled: !!propertyId,
  });

  if (fromEstimation && !draft) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/test-estimation"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Nouvelle analyse</h1>
            <p className="text-sm text-muted-foreground">Le brouillon de cette estimation n'est plus disponible.</p>
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/test-estimation">Retour a Test estimation</Link></Button>
      </div>
    );
  }

  if (savedAnalysisId) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to={isEstimation ? '/test-estimation' : '/properties'}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Nouvelle analyse</h1>
            <p className="text-sm text-muted-foreground">L'analyse de ce bien a deja ete enregistree.</p>
          </div>
        </div>
        <Button asChild><Link to={`/analysis/${savedAnalysisId}`}>Voir l'analyse</Link></Button>
      </div>
    );
  }

  if (isEstimation && !canCreate) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/test-estimation"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Nouvelle analyse</h1>
            <p className="text-sm text-muted-foreground">Vous n'avez pas l'autorisation de creer une analyse.</p>
          </div>
        </div>
      </div>
    );
  }

  const isEssentials = isEstimation && property;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={isEstimation ? '/test-estimation' : '/properties'} aria-label={isEstimation ? 'Retour a l\'estimation' : 'Retour aux biens'}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-display text-2xl font-bold">{isEssentials ? 'Analyse essentielle' : 'Nouvelle analyse'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEssentials
              ? 'Parametres simplifies, resultats en temps reel'
              : 'Saisissez les donnees financieres pour obtenir une evaluation complete'}
          </p>
        </div>
      </div>
      {draft && isEssentials && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p><strong>{draft.property.nom_bien} — {draft.property.ville}</strong> : bien cree a partir de votre estimation.</p>
          <p>Le prix, les loyers annuels et les charges sont preremplis. Ajustez si necessaire.</p>
          {draft.mode === 'price' && <p className="text-muted-foreground">Le prix repris est un prix cible calcule, a confirmer avec le vendeur.</p>}
        </div>
      )}
      {isEssentials ? (
        <AnalysisEssentials
          propertyId={propertyId}
          property={property}
          initialData={draft?.initialData}
          onBack={() => navigate(isEstimation ? '/test-estimation' : '/properties')}
          onSwitchToFull={() => navigate(`/new-analysis?propertyId=${propertyId}&source=estimation`)}
        />
      ) : (
        <AnalysisForm initialPropertyId={propertyId} initialData={draft?.initialData}
          fixedProperty={draft?.property} onDraftChange={draft ? saveDraft : undefined}
          onPropertyChange={handlePropertyChange}
          onSubmit={create.mutateAsync} isSubmitting={create.isPending} />
      )}
    </div>
  );
}
