import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import KPICards from '../components/KPICards';
import TopOpportunities from '../components/TopOpportunities';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatPercent } from '../utils/calculations';

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
    .map(a => ({ ...a, property: properties.find(p => p.id === a.property_id) }))
    .filter(a => a.property);

  const top5 = [...enriched].sort((a, b) => (b.score_global || 0) - (a.score_global || 0)).slice(0, 5);

  // Chart: score distribution
  const scoreRanges = [
    { name: 'A (90-100)', count: enriched.filter(a => a.score_global >= 90).length, fill: '#10B981' },
    { name: 'B (75-89)', count: enriched.filter(a => a.score_global >= 75 && a.score_global < 90).length, fill: '#3B82F6' },
    { name: 'C (60-74)', count: enriched.filter(a => a.score_global >= 60 && a.score_global < 75).length, fill: '#F59E0B' },
    { name: 'D (40-59)', count: enriched.filter(a => a.score_global >= 40 && a.score_global < 60).length, fill: '#F97316' },
    { name: 'E (0-39)', count: enriched.filter(a => a.score_global < 40).length, fill: '#EF4444' },
  ];

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopOpportunities items={top5} />
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">Distribution des scores</h3>
          </div>
          {enriched.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreRanges} layout="vertical">
                <XAxis type="number" tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}