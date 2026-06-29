import { NOTE_CONFIG } from '../utils/calculations';

export default function ScoreBadge({ note }) {
  const cfg = NOTE_CONFIG[note] || NOTE_CONFIG.C;
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${cfg.class}`}>
      {note}
    </span>
  );
}