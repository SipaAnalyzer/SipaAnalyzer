import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import { notifyAllUsers } from '@/utils/notifications';
import AnalysisForm from '../components/AnalysisForm';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function EditAnalysis() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: () => base44.entities.Analysis.get(analysisId),
  });

  const update = useMutation({
    mutationFn: (data) => base44.entities.Analysis.update(analysisId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['comments', analysis.property_id] });
      toast.success('Analyse mise à jour');
      recordAuditLog({ eventType: 'analysis_updated', targetType: 'analysis', targetId: analysisId, targetLabel: `Analyse #${analysisId?.slice(0, 8)}`, metadata: { property_id: analysis.property_id } });
      if (Number(variables.rendement_brut) >= 4) {
        notifyAllUsers({ eventType: 'yield_target_reached', targetType: 'property', targetId: analysis.property_id, targetLabel: `Rendement ${variables.rendement_brut}% atteint`, metadata: { analysis_id: analysisId, rendement_brut: variables.rendement_brut } });
      }
      navigate(`/property/${analysis.property_id}`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Modifier l'analyse</h1>
          <p className="text-sm text-muted-foreground">Mettez à jour les données financières</p>
        </div>
      </div>
      <AnalysisForm initialData={analysis} initialPropertyId={analysis?.property_id} onSubmit={update.mutate} isSubmitting={update.isPending} />
    </div>
  );
}
