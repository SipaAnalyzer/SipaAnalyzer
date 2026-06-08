import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import ScoreGauge from '../components/ScoreGauge';
import { formatCHF, formatPercent } from '../utils/calculations';
import { Plus, Search, Building2, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function Properties() {
  const { permissions, isAdmin } = usePermissions();
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [villeFilter, setVilleFilter] = useState('all');
  const [rendementFilter, setRendementFilter] = useState('all');

  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
  });
  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
  });

  const villes = useMemo(() => [...new Set(properties.map(p => p.ville).filter(Boolean))], [properties]);

  const enriched = useMemo(() => {
    return properties.map(p => {
      const propAnalyses = analyses.filter(a => a.property_id === p.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return { ...p, latestAnalysis: propAnalyses[0] || null, analysisCount: propAnalyses.length };
    });
  }, [properties, analyses]);

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (search && !p.nom_bien?.toLowerCase().includes(search.toLowerCase()) && !p.ville?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
      if (villeFilter !== 'all' && p.ville !== villeFilter) return false;
      if (rendementFilter !== 'all') {
        const rdt = p.latestAnalysis?.rendement_brut || 0;
        if (rendementFilter === 'lt4' && rdt >= 4) return false;
        if (rendementFilter === 'gte4' && rdt < 4) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, villeFilter, rendementFilter]);

  if (lp || la) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Biens immobiliers</h1>
          <p className="text-sm text-muted-foreground mt-1">{properties.length} bien{properties.length > 1 ? 's' : ''} dans votre portefeuille</p>
        </div>
        {(isAdmin || permissions.can_create_property) && (
          <Link to="/add-property"><Button className="gap-2"><Plus className="h-4 w-4" /> Ajouter un bien</Button></Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un bien..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="abandonne">Abandonné</SelectItem>
          </SelectContent>
        </Select>
        <Select value={villeFilter} onValueChange={setVilleFilter}>
          <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rendementFilter} onValueChange={setRendementFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border"><SelectValue placeholder="Rdt. brut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rendements</SelectItem>
            <SelectItem value="lt4">{"< 4%"}</SelectItem>
            <SelectItem value="gte4">{"≥ 4%"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun bien trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez votre premier bien pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Link key={p.id} to={`/property/${p.id}`} className="block">
              <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.nom_bien}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.ville}{p.canton ? `, ${p.canton}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.lien_annonce && (
                      <a href={p.lien_annonce} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors z-10" title="Voir l'annonce">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {p.latestAnalysis && <ScoreGauge score={p.latestAnalysis.score_global || 0} size={60} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge statut={p.statut} />
                  {p.latestAnalysis?.note && <ScoreBadge note={p.latestAnalysis.note} />}
                  <span className="text-xs text-muted-foreground ml-auto">{p.analysisCount} analyse{p.analysisCount > 1 ? 's' : ''}</span>
                </div>
                {p.latestAnalysis && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Prix total</p>
                      <p className="text-xs font-mono font-medium">{formatCHF(p.latestAnalysis.prix_total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rdt. brut</p>
                      <p className="text-xs font-mono font-medium">{formatPercent(p.latestAnalysis.rendement_brut)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rdt. net/FP</p>
                      <p className="text-xs font-mono font-medium text-primary">{formatPercent(p.latestAnalysis.rendement_net_fonds_propres)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}