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
        const content = (
          <div
            className="h-full bg-card rounded-xl border border-border p-5 transition-all duration-200 ease-out hover:border-primary/45 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="min-h-10 text-xs text-muted-foreground font-medium leading-snug">
                {card.label}
              </span>

              <span className={`shrink-0 rounded-lg p-2 ${card.className}`}>
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
