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
import { Plus, Search, Building2, Loader2, ExternalLink, MapPin } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

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

function getPropertyAccentColor(couleur) {
  if (couleur === 'rouge') return '#ff0000';
  if (couleur === 'orange') return '#f97316';
  if (couleur === 'vert') return '#22c55e';
  return 'hsl(var(--primary) / 0.62)';
}

function getPropertyCardStyle(couleur) {
  const accent = getPropertyAccentColor(couleur);
  return { '--sipa-card-accent': accent };
}

function getSipaTotalIncome(analysis) {
  const sipaEntry = analysis?.sipa_data?.find((entry) =>
    String(entry?.label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes('sipa total')
  );
  const importedAmount = sipaEntry?.values?.find((value) => value.type === 'amount' || typeof value.value === 'number');
  if (importedAmount?.value != null) return importedAmount.value;

  return Number(analysis?.honoraires_sipa || 0) + Number(analysis?.gestion || 0);
}

export default function Properties() {
  const { permissions, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [villeFilter, setVilleFilter] = useState('all');
  const [rendementFilter, setRendementFilter] = useState('all');
  const [couleurFilter, setCouleurFilter] = useState('all');
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
      queryClient.setQueryData(['properties'], (old) =>
        (old || []).map(p => p.id === id ? { ...p, couleur } : p)
      );
    },
  });

  const villes = useMemo(() => [...new Set(properties.map(p => p.ville).filter(Boolean))], [properties]);
  const enriched = useMemo(() => {
    return properties.map(p => {
      const propAnalyses = analyses.filter(a => a.property_id === p.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return { ...p, latestAnalysis: normalizeAnalysis(propAnalyses[0], p), analysisCount: propAnalyses.length };
    });
  }, [properties, analyses]);

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (search && !p.nom_bien?.toLowerCase().includes(search.toLowerCase()) && !p.ville?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
      if (villeFilter !== 'all' && p.ville !== villeFilter) return false;
      if (couleurFilter !== 'all' && (p.couleur || '') !== couleurFilter) return false;
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
            <SelectItem value="all">Toutes les couleurs</SelectItem>
            {COULEURS.filter(c => c.value).map(c => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-visible">
          {sorted.map(p => {
            const waveId = `property-wave-${p.id}`;
            return (
              <Link key={p.id} to={`/property/${p.id}`} className="relative block">
                <div className="sipa-card-motion sipa-property-card relative transform-gpu bg-card rounded-xl border border-border p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out group hover:z-30 hover:scale-[1.03] hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                  style={getPropertyCardStyle(p.couleur)}>
                  <div className="sipa-card-waves" style={{ color: 'var(--sipa-card-accent)' }} aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 26 150 26"
                      preserveAspectRatio="none"
                      shapeRendering="auto"
                    >
                      <defs>
                        <path
                          id={waveId}
                          d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"
                        />
                      </defs>
                      <g className="parallax">
                        <use href={`#${waveId}`} x="48" y="0" fill="currentColor" opacity="0.30" />
                        <use href={`#${waveId}`} x="48" y="3" fill="currentColor" opacity="0.22" />
                        <use href={`#${waveId}`} x="48" y="5" fill="currentColor" opacity="0.15" />
                        <use href={`#${waveId}`} x="48" y="7" fill="currentColor" opacity="0.10" />
                      </g>
                    </svg>
                  </div>
                  <div className="relative mb-4 h-40 overflow-hidden rounded-lg border border-border/40 bg-muted/20">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]" />
                    ) : (
                      <div className="sipa-card-icon flex h-full w-full items-center justify-center bg-muted/30">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/85 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                      {p.ville && (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span className="truncate">{p.ville}</span>
                        </span>
                      )}
                      {p.surface && (
                        <span className="rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
                          {p.surface} m²
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FavoriteButton propertyId={p.id} className="h-5 w-5 shrink-0" />
                        <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.nom_bien}</h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
                    </div>
                    {p.latestAnalysis && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Prix total</p>
                          <p className="text-xs font-mono font-medium">{formatCHF(p.latestAnalysis.prix_total)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Prix d'achat</p>
                          <p className="text-xs font-mono font-medium">{formatCHF(p.latestAnalysis.prix_bien)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Rdt. distribue / FP</p>
                          <p className="text-xs font-mono font-medium text-primary">{formatPercent(p.latestAnalysis.revenu_distribue_fonds_propres)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">SIPA total income</p>
                          <p className="text-xs font-mono font-medium">{formatCHF(getSipaTotalIncome(p.latestAnalysis))}</p>
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
