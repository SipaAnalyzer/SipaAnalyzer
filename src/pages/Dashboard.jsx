import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import KPICards from '../components/KPICards';
import TopOpportunities from '../components/TopOpportunities';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { normalizeAnalysis } from '../utils/calculations';

export default function Dashboard() {
  const { data: analyses = [], isLoading: la } = useQuery({
  queryKey: ['analyses'],
  queryFn: () => base44.entities.Analysis.list('-created_date', 200),
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 3000,
});

const { data: properties = [], isLoading: lp } = useQuery({
  queryKey: ['properties'],
  queryFn: () => base44.entities.Property.list('-created_date', 200),
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 3000,
});

  if (la || lp) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  const total = properties.length;
  const enCours = properties.filter(p => p.statut === 'en_cours').length;
  const valides = properties.filter(p => p.statut === 'valide').length;
  const abandonnes = properties.filter(p => p.statut === 'abandonne').length;

  const enriched = analyses
    .map(a => ({ ...normalizeAnalysis(a), property: properties.find(p => p.id === a.property_id) }))
    .filter(a => a.property);

  const top5 = [...enriched].sort((a, b) => (b.score_global || 0) - (a.score_global || 0)).slice(0, 5);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
        </div>
        <Link to="/new-analysis">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle analyse</Button>
        </Link>
      </div>

      <KPICards total={total} enCours={enCours} valides={valides} abandonnes={abandonnes} />

      <TopOpportunities items={top5} />
    </div>
  );
}
