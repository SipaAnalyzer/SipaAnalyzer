import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import ScoreGauge from '../components/ScoreGauge';
import FavoriteButton from '../components/FavoriteButton';
import { formatCHF, formatPercent, normalizeAnalysis, WORKFLOW_STATUSES } from '../utils/calculations';
import { Plus, Search, Building2, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import moment from 'moment';

const COULEURS = [
  { value: '', label: 'Aucune', className: 'bg-transparent border border-border' },
  { value: 'rouge', label: 'Rouge', className: 'bg-red-500' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'vert', label: 'Vert', className: 'bg-green-500' },
];

const SORT_OPTIONS = [
  { value: 'score-desc', label: 'Score (décroissant)' },
  { value: 'score-asc', label: 'Score (croissant)' },
  { value: 'nom-asc', label: 'Nom (A-Z)' },
  { value: 'nom-desc', label: 'Nom (Z-A)' },
  { value: 'date-desc', label: 'Plus récent' },
  { value: 'date-asc', label: 'Plus ancien' },
];

export default function Properties() {
  const { permissions, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [villeFilter, setVilleFilter] = useState('all');
  const [rendementFilter, setRendementFilter] = useState('all');
  const [couleurFilter, setCouleurFilter] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
  });
  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
  });

  const updateCouleur = useMutation({
    mutationFn: ({ id, couleur }) => base44.entities.Property.update(id, { couleur }),
    onMutate: async ({ id, couleur }) => {
      await queryClient.cancelQueries({ queryKey: ['properties'] });
      const previous = queryClient.getQueryData(['properties']);
      queryClient.setQueryData(['properties'], (old) =>
        (old || []).map(p => p.id === id ? { ...p, couleur } : p)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['properties'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  const villes = useMemo(() => [...new Set(properties.map(p => p.ville).filter(Boolean))], [properties]);
  const couleursUtilisees = useMemo(() =>
    [...new Set(properties.map(p => p.couleur).filter(Boolean))],
    [properties]
  );

  const enriched = useMemo(() => {
    return properties.map(p => {
      const propAnalyses = analyses.filter(a => a.property_id === p.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return { ...p, latestAnalysis: normalizeAnalysis(propAnalyses[0], p.ville), analysisCount: propAnalyses.length };
    });
  }, [properties, analyses]);

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (search && !p.nom_bien?.toLowerCase().includes(search.toLowerCase()) && !p.ville?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
      if (villeFilter !== 'all' && p.ville !== villeFilter) return false;
      if (couleurFilter && (p.couleur || '') !== couleurFilter) return false;
      if (rendementFilter !== 'all') {
        const rdt = p.latestAnalysis?.rendement_brut || 0;
        if (rendementFilter === 'lt4' && rdt >= 4) return false;
        if (rendementFilter === 'gte4' && rdt < 4) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, villeFilter, couleurFilter, rendementFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'score-desc': return arr.sort((a, b) => (b.latestAnalysis?.score_global ?? 0) - (a.latestAnalysis?.score_global ?? 0));
      case 'score-asc': return arr.sort((a, b) => (a.latestAnalysis?.score_global ?? 0) - (b.latestAnalysis?.score_global ?? 0));
      case 'nom-asc': return arr.sort((a, b) => (a.nom_bien ?? '').localeCompare(b.nom_bien ?? ''));
      case 'nom-desc': return arr.sort((a, b) => (b.nom_bien ?? '').localeCompare(a.nom_bien ?? ''));
      case 'date-desc': return arr.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));
      case 'date-asc': return arr.sort((a, b) => new Date(a.created_at || a.created_date) - new Date(b.created_at || b.created_date));
      default: return arr;
    }
  }, [filtered, sortBy]);



  if (lp || la) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Biens immobiliers</h1>
          <p className="text-sm text-muted-foreground mt-1">{properties.length} bien{properties.length > 1 ? 's' : ''} dans votre portefeuille</p>
        </div>
        {(isAdmin || permissions.can_create_property) && (
          <Link to="/add-property" className="w-full sm:w-auto"><Button className="w-full sm:w-auto gap-2"><Plus className="h-4 w-4" /> Ajouter un bien</Button></Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_130px_130px] gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un bien..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {WORKFLOW_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={villeFilter} onValueChange={setVilleFilter}>
          <SelectTrigger className="w-full bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={couleurFilter} onValueChange={setCouleurFilter}>
          <SelectTrigger className="w-full bg-card border-border"><SelectValue placeholder="Couleur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les couleurs</SelectItem>
            {COULEURS.filter(c => c.value && couleursUtilisees.includes(c.value)).map(c => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${c.className}`} />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full bg-card border-border"><SelectValue placeholder="Trier par" /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
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
          {sorted.map(p => {
            const colorDef = COULEURS.find(c => c.value === p.couleur);
            return (
              <Link key={p.id} to={`/property/${p.id}`} className="block">
                <div className={`bg-card rounded-xl border p-5 hover:border-primary/30 transition-all duration-200 group ${p.couleur ? 'border-t-4' : 'border-border border-t-border'}`}
                  style={p.couleur ? { borderTopColor: p.couleur === 'rouge' ? '#ef4444' : p.couleur === 'orange' ? '#f97316' : '#22c55e' } : {}}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.nom_bien}</h3>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {p.ville}{p.canton ? `, ${p.canton}` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <FavoriteButton propertyId={p.id} className="h-8 w-8 z-10" />
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
                  <div className="text-[11px] text-muted-foreground mb-3">
                    Créé {moment(p.created_at || p.created_date).fromNow()}
                    {p.updated_at && p.updated_at !== p.created_at ? ` · modifié ${moment(p.updated_at).fromNow()}` : ''}
                  </div>
                  {p.latestAnalysis && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
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
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground mr-1">Couleur :</span>
                    {['rouge', 'orange', 'vert'].map(c => (
                      <button
                        key={c}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCouleur.mutate({ id: p.id, couleur: p.couleur === c ? '' : c }); }}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${p.couleur === c ? 'border-white ring-2 ring-primary scale-110' : 'border-border/50 opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: c === 'rouge' ? '#ef4444' : c === 'orange' ? '#f97316' : '#22c55e' }}
                        title={c}
                      />
                    ))}
                    {p.couleur && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCouleur.mutate({ id: p.id, couleur: '' }); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                        title="Enlever la couleur"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
