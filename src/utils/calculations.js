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

  const NOTE_ORDER = ['C', 'B', 'A', 'S'];

  function getBaseNote(rb) {
    if (rb >= 5) return 'S';
    if (rb >= 4) return 'A';
    if (rb >= 3.5) return 'B';
    return 'C';
  }

  function adjustNote(base, emplacement, etat) {
    let bonus = 0;
    const pos = ['Excellent', 'Très bon'];
    const neg = ['Mauvais'];
    if (pos.includes(emplacement)) bonus++;
    else if (neg.includes(emplacement)) bonus--;
    if (pos.includes(etat)) bonus++;
    else if (neg.includes(etat)) bonus--;
    bonus = Math.max(-1, Math.min(1, bonus >= 1 ? 1 : (bonus <= -1 ? -1 : 0)));
    const idx = Math.max(0, Math.min(NOTE_ORDER.length - 1, NOTE_ORDER.indexOf(base) + bonus));
    return NOTE_ORDER[idx];
  }

  const baseNote = getBaseNote(rendementBrut);
  const adjustedNote = adjustNote(baseNote, data.emplacement_bien, data.etat_batiment);

  const SCORE_MAP = { C: 50, B: 67, A: 82, S: 95 };

  return {
    prix_total: Math.round(prixBien + Number(data.versement_initial || 0) + Number(data.amortissement_5_ans || 0) + Number(data.honoraires_sipa || 0) + Number(data.frais_dossier_bancaire || 0)),
    rendement_brut: round2(rendementBrut),
    revenu_net: Math.round(revenuNet),
    rendement_net_fonds_propres: round2(rendementNetFP),
    revenu_distribue: Math.round(revenuDistribue),
    revenu_distribue_fonds_propres: round2(revenuDistribueFP),
    score_global: SCORE_MAP[adjustedNote],
    note: adjustedNote,
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
  S: { class: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  A: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  B: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  C: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};
