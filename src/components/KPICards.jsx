import {
  BadgeCheck,
  Building2,
  ClipboardList,
  FileSearch,
  HandCoins,
  Handshake,
  HelpCircle,
  Megaphone,
  Search,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { STATUS_CONFIG, WORKFLOW_STATUSES } from '../utils/calculations';

const statusIcons = {
  en_cours: Search,
  demande_complementaire: HelpCircle,
  visite_sipa: Building2,
  demande_rapport_expertise_externe: FileSearch,
  proposition_achat: HandCoins,
  negociation: Handshake,
  proposition_acceptee: BadgeCheck,
  commercialise: Megaphone,
  abandonne: XCircle,
};

const totalCard = {
  value: 'total',
  label: 'Total biens',
  icon: ClipboardList,
  className: 'bg-primary/15 text-primary',
  href: '/properties',
};

export default function KPICards({
  total = 0,
  statusCounts = {},
}) {
  const cards = [
    totalCard,
    ...WORKFLOW_STATUSES.map((status) => ({
      ...status,
      icon: statusIcons[status.value] || ClipboardList,
      className: STATUS_CONFIG[status.value]?.class || 'bg-muted text-muted-foreground',
      count: statusCounts[status.value] || 0,
    })),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-visible">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = card.value === 'total' ? total : card.count;
        const href = card.href || `/properties?status=${card.value}`;
        const waveId = `gentle-wave-${card.value}`;
        const content = (
          <div
            className="sipa-card-motion sipa-dashboard-card h-full bg-card rounded-xl border border-border p-5 transition-all duration-200 ease-out hover:border-primary/45 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
          >
            <div className="sipa-card-waves" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 24 150 28"
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
                  <use href={`#${waveId}`} x="48" y="0" fill="currentColor" opacity="0.22" />
                  <use href={`#${waveId}`} x="48" y="3" fill="currentColor" opacity="0.16" />
                  <use href={`#${waveId}`} x="48" y="5" fill="currentColor" opacity="0.10" />
                  <use href={`#${waveId}`} x="48" y="7" fill="currentColor" opacity="0.07" />
                </g>
              </svg>
            </div>

            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="min-h-10 text-xs text-muted-foreground font-medium leading-snug">
                {card.label}
              </span>

              <span className={`sipa-card-icon shrink-0 rounded-lg p-2 ${card.className}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <p className="text-3xl font-bold tracking-tight">
              {value}
            </p>
          </div>
        );

        return (
          <Link
            key={card.value}
            to={href}
            className="block h-full"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
