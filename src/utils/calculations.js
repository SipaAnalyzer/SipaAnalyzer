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

  const valQuali = (v, def) => {
    const map = { Excellent: 10, 'Très bon': 8, Bon: 5, Mauvais: 2 };
    return map[v] ?? def;
  };

  const scoreRendementBrut = Math.min(rendementBrut / 8 * 55, 55);
  const scoreRendementNetFP = Math.min(Math.max(rendementNetFP / 15 * 25, 0), 25);
  const scoreRevenuDistribue = Math.min(Math.max(revenuDistribueFP / 10 * 8, 0), 8);
  const scoreEmplacement = valQuali(data.emplacement_bien, 5) * 0.7;
  const scoreEtat = valQuali(data.etat_batiment, 5) * 0.5;

  let scoreGlobal = round2(
    scoreRendementBrut + scoreRendementNetFP + scoreRevenuDistribue + scoreEmplacement + scoreEtat
  );
  if (rendementBrut >= 4 && scoreGlobal < 70) scoreGlobal = 70;

  function noteFromScore(s) {
    if (s >= 85) return 'S';
    if (s >= 70) return 'A';
    if (s >= 55) return 'B';
    if (s >= 40) return 'C';
    return 'D';
  }

  const note = noteFromScore(scoreGlobal);

  return {
    prix_total: Math.round(prixBien + Number(data.versement_initial || 0) + Number(data.amortissement_5_ans || 0) + Number(data.honoraires_sipa || 0) + Number(data.frais_dossier_bancaire || 0)),
    rendement_brut: round2(rendementBrut),
    revenu_net: Math.round(revenuNet),
    rendement_net_fonds_propres: round2(rendementNetFP),
    revenu_distribue: Math.round(revenuDistribue),
    revenu_distribue_fonds_propres: round2(revenuDistribueFP),
    score_global: scoreGlobal,
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
  en_cours: { label: 'En analyse', class: 'bg-blue-500/20 text-blue-400' },
  attente_direction: { label: 'Attente direction', class: 'bg-amber-500/20 text-amber-400' },
  valide: { label: 'Valide', class: 'bg-emerald-500/20 text-emerald-400' },
  refuse: { label: 'Refuse', class: 'bg-red-500/20 text-red-400' },
  surveillance: { label: 'Surveillance', class: 'bg-violet-500/20 text-violet-400' },
  abandonne: { label: 'Abandonne', class: 'bg-red-500/20 text-red-400' },
};

export const WORKFLOW_STATUSES = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'en_cours', label: 'En analyse' },
  { value: 'attente_direction', label: 'Attente direction' },
  { value: 'valide', label: 'Valide' },
  { value: 'refuse', label: 'Refuse' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'abandonne', label: 'Abandonne' },
];
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
  S: { class: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  A: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  B: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  C: { class: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  D: { class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};
