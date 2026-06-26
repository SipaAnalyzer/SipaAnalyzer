export function calculateAnalysis(data) {
  const prixBien = Number(data.prix_bien || 0);
  const revenusLocatifs = Number(data.revenus_locatifs || 0);
  const chargesOperationnelles = Number(data.charges_operationnelles || 0);
  const interetsHypothecaires = Number(data.interets_hypothecaires || 0);
  const gestion = Number(data.gestion || 0);
  const hypotheque = Number(data.hypotheque || 0);
  const fondsPropres = Number(data.fonds_propres || 0);
  const impot = Number(data.impot || 0);

  const revenuNet = revenusLocatifs - chargesOperationnelles - interetsHypothecaires - gestion;
  const impotCalcule = impot;
  const rendementBrut = prixBien > 0 ? (revenusLocatifs / prixBien) * 100 : 0;
  const rendementNetFP = fondsPropres > 0 ? (revenuNet / fondsPropres) * 100 : 0;
  const revenuDistribue = revenuNet - impotCalcule;
  const revenuDistribueFP = fondsPropres > 0 ? (revenuDistribue / fondsPropres) * 100 : 0;

  const s1 = Math.min(Math.max(rendementNetFP, 0) / 15 * 100, 100) * 0.35;
  const s2 = Math.min(Math.max(revenuDistribueFP, 0) / 10 * 100, 100) * 0.25;
  const s3 = Math.min(Math.max(rendementBrut, 0) / 10 * 100, 100) * 0.20;
  const ltv = fondsPropres > 0 ? hypotheque / (hypotheque + fondsPropres) : 1;
  const s4 = Math.max(0, (1 - ltv / 0.8) * 100) * 0.10;
  const currentYear = new Date().getFullYear();
  const age = currentYear - (data.annee_construction || currentYear - 20);
  const s5 = Math.max(0, Math.min(100, 100 - age * 1.5)) * 0.10;
  const score = Math.round(Math.max(0, Math.min(100, s1 + s2 + s3 + s4 + s5)));
  const note = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';

  return {
    prix_total: Math.round(prixBien + Number(data.versement_initial || 0) + Number(data.amortissement_5_ans || 0) + Number(data.honoraires_sipa || 0) + Number(data.frais_dossier_bancaire || 0)),
    rendement_brut: round2(rendementBrut),
    revenu_net: Math.round(revenuNet),
    rendement_net_fonds_propres: round2(rendementNetFP),
    revenu_distribue: Math.round(revenuDistribue),
    revenu_distribue_fonds_propres: round2(revenuDistribueFP),
    score_global: score,
    note,
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

export function normalizeAnalysis(analysis) {
  if (!analysis) return analysis;
  return {
    ...analysis,
    ...calculateAnalysis(analysis),
  };
}

export function normalizeAnalyses(analyses = []) {
  return analyses.map(normalizeAnalysis);
}

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

export function solveRateFromAmort(amort, pv, n) {
  if (!amort || amort <= 0 || !pv || pv <= 0 || !n || n <= 0) return null;
  const target = amort / pv;
  if (target <= 0) return null;

  let lo = 0.00005;
  let hi = 0.15;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const f = mid / (1 - Math.pow(1 + mid, -n));
    if (f > target) hi = mid;
    else lo = mid;
  }
  const r = (lo + hi) / 2;

  const pmt = pv * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const computedAmort = Math.round(pmt - pv * r);
  if (computedAmort !== Math.round(amort)) return null;

  return r;
}

export const NOTE_CONFIG = {
  A: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  B: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  C: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  D: { class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  E: { class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};
