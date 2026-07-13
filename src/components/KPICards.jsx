import { Building2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
  {
    key: 'total',
    label: 'Total biens',
    icon: Building2,
    color: 'text-primary',
    filter: null,
  },
  {
    key: 'enCours',
    label: 'En cours',
    icon: Clock,
    color: 'text-blue-400',
    filter: 'en_cours',
  },
  {
    key: 'valides',
    label: 'Validés',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    filter: 'valide',
  },
  {
    key: 'abandonnes',
    label: 'Abandonnés',
    icon: XCircle,
    color: 'text-red-400',
    filter: 'abandonne',
  },
];

export default function KPICards({
  total = 0,
  enCours = 0,
  valides = 0,
  abandonnes = 0,
}) {
  const values = {
    total,
    enCours,
    valides,
    abandonnes,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const content = (
          <div
            className={`bg-card rounded-xl border border-border p-5 transition-colors ${
              card.filter
                ? 'hover:border-primary/40 cursor-pointer'
                : 'hover:border-primary/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">
                {card.label}
              </span>

              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>

            <p className="text-3xl font-bold tracking-tight">
              {values[card.key]}
            </p>
          </div>
        );

        return card.filter ? (
          <Link
            key={card.key}
            to={`/properties?status=${card.filter}`}
          >
            {content}
          </Link>
        ) : (
          <div key={card.key}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
