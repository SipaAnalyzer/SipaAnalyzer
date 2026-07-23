import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ExternalLink, SlidersHorizontal, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import ScoreGauge from './ScoreGauge';
import StatusBadge from './StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCHF, formatPercent } from '../utils/calculations';

const SORT_OPTIONS = [
  { value: 'score', label: 'Score', key: 'score_global' },
  { value: 'net_equity', label: 'Rdt. net / FP', key: 'rendement_net_fonds_propres' },
  { value: 'gross_yield', label: 'Rdt. brut', key: 'rendement_brut' },
  { value: 'price', label: 'Prix total', key: 'prix_total' },
];

export default function TopOpportunities({ items = [] }) {
  const [sortBy, setSortBy] = useState('score');
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sortBy) || SORT_OPTIONS[0];
  const visibleItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const diff = Number(b[selectedSort.key] || 0) - Number(a[selectedSort.key] || 0);
        if (diff !== 0) return diff;
        return Number(b.score_global || 0) - Number(a.score_global || 0);
      })
      .slice(0, 5);
  }, [items, selectedSort.key]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune opportunité à afficher</p>
        <p className="mt-1 text-xs text-muted-foreground">Créez votre première analyse pour voir les meilleures opportunités</p>
      </div>
    );
  }

  const [leader, ...others] = visibleItems;

  return (
    <section className="overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-heading text-sm font-semibold">Top 5 Opportunités</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Les dossiers actifs les plus prometteurs</p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="hidden text-xs text-muted-foreground sm:inline">Trier par</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-full min-w-[170px] border-primary/20 bg-primary/10 text-xs font-medium text-primary sm:w-[190px]">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(320px,0.95fr)_1.35fr]">
        <LeaderOpportunity key={leader.id + '-' + sortBy} item={leader} />
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((item, index) => (
            <CompactOpportunity key={item.id + '-' + sortBy} item={item} rank={index + 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LeaderOpportunity({ item }) {
  return (
    <Link
      to={`/property/${item.property_id}`}
      className="group relative flex min-h-[310px] overflow-hidden rounded-xl border border-primary/35 bg-primary/10 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
      <div className="flex w-full flex-col">
        <div className="relative mb-4 h-32 overflow-hidden rounded-lg border border-primary/20 bg-background/70">
          {item.property?.image_url ? (
            <img
              src={item.property.image_url}
              alt={item.property?.nom_bien || 'Bien'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-primary">
              <Building2 className="h-9 w-9" />
              <span className="text-xs font-medium">Dossier immobilier</span>
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            <Trophy className="h-3.5 w-3.5" />
            #1
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Meilleure opportunité</p>
            <h3 className="mt-1 line-clamp-2 font-heading text-xl font-semibold transition-colors group-hover:text-primary">
              {item.property?.nom_bien || 'Sans nom'}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{item.property?.ville || 'Ville non renseignée'}</span>
              <StatusBadge statut={item.statut} />
              <ExternalLinkButton url={item.property?.lien_annonce} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ScoreGauge score={item.score_global || 0} size={68} />
            <ScoreBadge note={item.note} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <OpportunityMetric label="Rdt. Net / FP" value={formatPercent(item.rendement_net_fonds_propres)} highlight />
          <OpportunityMetric label="Rdt. Brut" value={formatPercent(item.rendement_brut)} />
          <OpportunityMetric label="Prix total" value={formatCHF(item.prix_total)} />
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-primary">
          <span>Ouvrir la fiche</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function CompactOpportunity({ item, rank }) {
  return (
    <Link
      to={`/property/${item.property_id}`}
      className="group flex min-h-[148px] flex-col rounded-xl border border-border/70 bg-background/45 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:bg-muted/30 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {item.property?.image_url ? (
            <img
              src={item.property.image_url}
              alt={item.property?.nom_bien || 'Bien'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Building2 className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ScoreGauge score={item.score_global || 0} size={52} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-card px-2 py-1 text-[10px] font-bold text-primary">#{rank}</span>
              <ScoreBadge note={item.note} />
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold transition-colors group-hover:text-primary">
              {item.property?.nom_bien || 'Sans nom'}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{item.property?.ville || 'Ville non renseignée'}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <OpportunityMetric label="Rdt. Net / FP" value={formatPercent(item.rendement_net_fonds_propres)} highlight />
        <OpportunityMetric label="Prix total" value={formatCHF(item.prix_total)} />
      </div>
    </Link>
  );
}

function ExternalLinkButton({ url }) {
  if (!url) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-primary"
      title="Annonce disponible"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
      }}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Annonce
    </span>
  );
}

function OpportunityMetric({ label, value, highlight = false }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/70 p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-mono text-xs font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
