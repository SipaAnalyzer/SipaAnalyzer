import { STATUS_CONFIG } from '../utils/calculations';

export default function StatusBadge({ statut }) {
  const cfg = STATUS_CONFIG[statut] || STATUS_CONFIG.brouillon;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}