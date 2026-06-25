import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import AnalysisForm from '../components/AnalysisForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NewAnalysis() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId') || '';

  const create = useMutation({
    mutationFn: (data) => base44.entities.Analysis.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Analyse enregistrée avec succès');
      recordAuditLog({ eventType: 'analysis_created', targetType: 'analysis', targetId: result.id, targetLabel: `Analyse #${result.id?.slice(0, 8)}`, metadata: { property_id: result.property_id } });
      navigate(`/property/${result.property_id}`);
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/properties"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Nouvelle analyse</h1>
          <p className="text-sm text-muted-foreground">Saisissez les données financières pour obtenir une évaluation complète</p>
        </div>
      </div>
      <AnalysisForm initialPropertyId={propertyId} onSubmit={create.mutate} isSubmitting={create.isPending} />
    </div>
  );
}