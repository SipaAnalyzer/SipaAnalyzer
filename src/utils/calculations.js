export function calculateAnalysis(data) {
  const prix_total = (data.prix_bien || 0) + (data.versement_copropriete || 0) + (data.honoraires_sipa || 0);
  const rendement_brut = prix_total > 0 ? ((data.revenus_locatifs || 0) / prix_total) * 100 : 0;
  const revenu_net = (data.revenus_locatifs || 0) - (data.charges_operationnelles || 0) - (data.interets_hypothecaires || 0) - (data.gestion || 0) - (data.amortissements || 0) - (data.autres_couts || 0);
  const rendement_net_fp = (data.fonds_propres || 0) > 0 ? (revenu_net / data.fonds_propres) * 100 : 0;
  const revenu_distribue = revenu_net - (data.impot || 0);
  const revenu_distribue_fp = (data.fonds_propres || 0) > 0 ? (revenu_distribue / data.fonds_propres) * 100 : 0;

  const s1 = Math.min(Math.max(rendement_net_fp, 0) / 15 * 100, 100) * 0.35;
  const s2 = Math.min(Math.max(revenu_distribue_fp, 0) / 10 * 100, 100) * 0.25;
  const s3 = Math.min(Math.max(rendement_brut, 0) / 10 * 100, 100) * 0.20;
  const ltv = prix_total > 0 ? (data.hypotheque || 0) / prix_total : 1;
  const s4 = Math.max(0, (1 - ltv / 0.8) * 100) * 0.10;
  const currentYear = new Date().getFullYear();
  const age = currentYear - (data.annee_construction || currentYear - 20);
  const s5 = Math.max(0, Math.min(100, 100 - age * 1.5)) * 0.10;
  const score = Math.round(Math.max(0, Math.min(100, s1 + s2 + s3 + s4 + s5)));
  const note = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';

  return {
    prix_total: Math.round(prix_total),
    rendement_brut: round2(rendement_brut),
    revenu_net: Math.round(revenu_net),
    rendement_net_fonds_propres: round2(rendement_net_fp),
    revenu_distribue: Math.round(revenu_distribue),
    revenu_distribue_fonds_propres: round2(revenu_distribue_fp),
    score_global: score,
    note
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

export function formatCHF(amount) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatPercent(value) {
  return `${(value || 0).toFixed(2)}%`;
}

export const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', class: 'bg-zinc-500/20 text-zinc-400' },
  en_cours: { label: 'En cours', class: 'bg-blue-500/20 text-blue-400' },
  valide: { label: 'Validé', class: 'bg-emerald-500/20 text-emerald-400' },
  abandonne: { label: 'Abandonné', class: 'bg-red-500/20 text-red-400' },
};

export const NOTE_CONFIG = {
  A: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  B: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  C: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  D: { class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  E: { class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};