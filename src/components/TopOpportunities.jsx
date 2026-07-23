import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ExternalLink, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import StatusBadge from './StatusBadge';
import { formatCHF, formatPercent } from '../utils/calculations';

const clampScore = (score) => Math.max(0, Math.min(100, Number(score) || 0));

function scoreColor(score) {
  if (score >= 80) return 'bg-primary';
  if (score >= 65) return 'bg-amber-400';
  return 'bg-red-500';
}

export default function TopOpportunities({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune opportunité à afficher</p>
        <p className="mt-1 text-xs text-muted-foreground">Créez votre première analyse pour voir les meilleures opportunités</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
        <span className="w-fit rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Classées par score
        </span>
      </div>

      <div className="space-y-3 p-4">
        {items.map((item, index) => {
          const score = clampScore(item.score_global);
          const isLeader = index === 0;

          return (
            <Link
              key={item.id}
              to={`/property/${item.property_id}`}
              className={`group block rounded-xl border p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                isLeader
                  ? 'border-primary/35 bg-primary/10 hover:border-primary/60 hover:shadow-primary/10'
                  : 'border-border/70 bg-background/45 hover:border-primary/35 hover:bg-muted/30'
              }`}
            >
              <div className="grid gap-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
                  {item.property?.image_url ? (
                    <img
                      src={item.property.image_url}
                      alt={item.property?.nom_bien || 'Bien'}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <span
                    className={`absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[10px] font-bold ${
                      isLeader ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'
                    }`}
                  >
                    {isLeader ? <Trophy className="h-3.5 w-3.5" /> : `#${index + 1}`}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                      {item.property?.nom_bien || 'Sans nom'}
                    </h3>
                    {isLeader && (
                      <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Meilleure opportunité
                      </span>
                    )}
                    {item.property?.lien_annonce && (
                      <span
                        className="text-muted-foreground transition-colors group-hover:text-primary"
                        title="Annonce disponible"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          window.open(item.property.lien_annonce, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.property?.ville || 'Ville non renseignée'}</span>
                    <StatusBadge statut={item.statut} />
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${scoreColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:min-w-[360px] sm:grid-cols-[82px_1fr_1fr_1fr_auto] sm:items-center">
                  <div className="rounded-lg border border-border/70 bg-card/70 p-2 text-center">
                    <p className="mb-1 text-[10px] text-muted-foreground">Score</p>
                    <ScoreBadge note={item.note} />
                  </div>
                  <OpportunityMetric label="Rdt. Net / FP" value={formatPercent(item.rendement_net_fonds_propres)} highlight />
                  <OpportunityMetric label="Rdt. Brut" value={formatPercent(item.rendement_brut)} />
                  <OpportunityMetric label="Prix total" value={formatCHF(item.prix_total)} />
                  <span className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all group-hover:border-primary/40 group-hover:text-primary sm:flex">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
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
