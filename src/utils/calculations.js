const LOCATION_SCORES = {
  'Lausanne': 15, 'Neuchâtel': 15, 'Neuchatel': 15,
  'Genève': 13, 'Geneve': 13, 'Zurich': 13, 'Zürich': 13,
  'Basel': 13, 'Bâle': 13, 'Bern': 13, 'Berne': 13,
  'Montreux': 13, 'Vevey': 13, 'Nyon': 13, 'Morges': 13,
  'Pully': 13, 'Lutry': 13, 'Lugano': 13,
  'Fribourg': 12, 'Yverdon-les-Bains': 12, 'Yverdon': 12,
  'Sion': 12, 'Sierre': 12, 'Martigny': 12, 'Aigle': 12,
  'Renens': 12, 'Prilly': 12,   'Crissier': 12,
  'Bussigny': 12, 'Ecublens': 12, 'Écublens': 12,
  'La Chaux-de-Fonds': 10, 'Le Locle': 10,
  'Bienne': 10, 'Biel': 10, 'Delémont': 10,
  'Moudon': 10, 'Payerne': 10, 'Orbe': 10,
  'Cossonay': 10, 'Aubonne': 10, 'Rolle': 10,
  'Gland': 10, 'Coppet': 10,
  'Sainte-Croix': 7, 'Ste-Croix': 7,
};

function getLocationScore(ville) {
  if (!ville) return 5;
  const normalized = ville.trim().toLowerCase();
  for (const [city, score] of Object.entries(LOCATION_SCORES)) {
    if (city.toLowerCase() === normalized) return score;
  }
  return 5;
}

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

  const valEtat = (v) => {
    const map = { Excellent: 5, 'Très bon': 4, Bon: 3, Moyen: 2, Mauvais: 1 };
    return map[v] ?? 3;
  };

  const scoreRendementBrut = rendementBrut <= 4
    ? rendementBrut / 4 * 60
    : 60 + (rendementBrut - 4) / 4 * 25;
  const scoreRendementNetFP = Math.min(Math.max(rendementNetFP / 15 * 5, 0), 5);
  const scoreEmplacement = getLocationScore(data.ville);
  const scoreEtat = valEtat(data.etat_batiment);

  let scoreGlobal = Math.min(round2(
    Math.min(scoreRendementBrut, 85) + scoreRendementNetFP + scoreEmplacement + scoreEtat
  ), 100);

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
    score_emplacement: scoreEmplacement,
    score_etat: scoreEtat,
    note,
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

export function normalizeAnalysis(analysis, ville) {
  if (!analysis) return analysis;
  return {
    ...analysis,
    ...calculateAnalysis(ville ? { ...analysis, ville } : analysis),
  };
}

export function normalizeAnalyses(analyses = [], property) {
  const ville = property?.ville;
  return analyses.map((a) => normalizeAnalysis(a, ville));
}

export function formatCHF(amount) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatPercent(value) {
  return `${(value || 0).toFixed(2)}%`;
}

export const STATUS_CONFIG = {
  en_cours: { label: "En cours d'analyse", class: 'bg-blue-500/20 text-blue-400' },
  demande_complementaire: { label: 'Demande complementaire', class: 'bg-cyan-500/20 text-cyan-400' },
  visite_sipa: { label: 'Visite SIPA', class: 'bg-violet-500/20 text-violet-400' },
  demande_rapport_expertise_externe: { label: 'Demande rapport expertise externe', class: 'bg-indigo-500/20 text-indigo-400' },
  proposition_achat: { label: "Proposition d'achat", class: 'bg-amber-500/20 text-amber-400' },
  negociation: { label: 'Negociation', class: 'bg-orange-500/20 text-orange-400' },
  proposition_acceptee: { label: 'Proposition acceptee', class: 'bg-emerald-500/20 text-emerald-400' },
  commercialise: { label: 'Commercialise', class: 'bg-lime-500/20 text-lime-400' },
  abandonne: { label: 'Abandonne', class: 'bg-red-500/20 text-red-400' },
  brouillon: { label: 'Brouillon', class: 'bg-zinc-500/20 text-zinc-400' },
  attente_direction: { label: 'Attente direction', class: 'bg-amber-500/20 text-amber-400' },
  valide: { label: 'Valide', class: 'bg-emerald-500/20 text-emerald-400' },
  refuse: { label: 'Refuse', class: 'bg-red-500/20 text-red-400' },
  surveillance: { label: 'Surveillance', class: 'bg-violet-500/20 text-violet-400' },
};

export const WORKFLOW_STATUSES = [
  { value: 'en_cours', label: "En cours d'analyse" },
  { value: 'demande_complementaire', label: 'Demande complementaire' },
  { value: 'visite_sipa', label: 'Visite SIPA' },
  { value: 'demande_rapport_expertise_externe', label: 'Demande rapport expertise externe' },
  { value: 'proposition_achat', label: "Proposition d'achat" },
  { value: 'negociation', label: 'Negociation' },
  { value: 'proposition_acceptee', label: 'Proposition acceptee' },
  { value: 'commercialise', label: 'Commercialise' },
  { value: 'abandonne', label: 'Abandonne' },
];

export const ACTIVE_PROPERTY_STATUSES = [
  'en_cours',
  'demande_complementaire',
  'visite_sipa',
  'demande_rapport_expertise_externe',
  'proposition_achat',
  'negociation',
];

export const FINALIZED_PROPERTY_STATUSES = ['proposition_acceptee', 'commercialise', 'valide'];

export function isActivePropertyStatus(status) {
  return ACTIVE_PROPERTY_STATUSES.includes(status);
}

export function isFinalizedPropertyStatus(status) {
  return FINALIZED_PROPERTY_STATUSES.includes(status);
}
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
