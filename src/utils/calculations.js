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

// Market price/m2 benchmarks are indicative public 2026 values from RealAdvisor/Acheteur/Homegate.
const MARKET_PRICE_M2_BENCHMARKS = {
  lausanne: { priceM2: 11567, score: 15 },
  'yverdon-les-bains': { priceM2: 7785, score: 12 },
  yverdon: { priceM2: 7785, score: 12 },
  boudry: { priceM2: 6763, score: 10 },
};

const REGIONAL_MARKET_BENCHMARKS = {
  Vaud: { priceM2: 8500, score: 11 },
  Neuchatel: { priceM2: 6900, score: 10 },
  'Neuchâtel': { priceM2: 6900, score: 10 },
  Valais: { priceM2: 6200, score: 9 },
  Fribourg: { priceM2: 6500, score: 9 },
  Geneve: { priceM2: 12500, score: 13 },
  Genève: { priceM2: 12500, score: 13 },
};

function normalizeLocationName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getLegacyLocationScore(ville) {
  if (!ville) return 5;
  const normalized = normalizeLocationName(ville);
  for (const [city, score] of Object.entries(LOCATION_SCORES)) {
    if (normalizeLocationName(city) === normalized) return score;
  }
  return 5;
}

function getMarketBenchmark(ville, canton) {
  const cityKey = normalizeLocationName(ville);
  if (MARKET_PRICE_M2_BENCHMARKS[cityKey]) return MARKET_PRICE_M2_BENCHMARKS[cityKey];

  const cantonKey = Object.keys(REGIONAL_MARKET_BENCHMARKS).find(
    (key) => normalizeLocationName(key) === normalizeLocationName(canton)
  );
  return cantonKey ? REGIONAL_MARKET_BENCHMARKS[cantonKey] : null;
}

function getPriceM2ScoreAdjustment(priceM2, benchmarkPriceM2) {
  if (!priceM2 || !benchmarkPriceM2) return 0;

  const ratio = priceM2 / benchmarkPriceM2;
  if (ratio <= 0.75) return 3;
  if (ratio <= 0.9) return 2;
  if (ratio <= 1.05) return 1;
  if (ratio <= 1.2) return 0;
  if (ratio <= 1.35) return -1;
  return -2;
}

export function getMarketPriceM2Comparison(data = {}) {
  const ville = data?.ville;
  const canton = data?.canton;
  const prixBien = Number(data?.prix_bien || 0);
  const surface = Number(data?.surface || 0);
  const benchmark = getMarketBenchmark(ville, canton);
  const priceM2 = prixBien > 0 && surface > 0 ? prixBien / surface : 0;
  const adjustment = getPriceM2ScoreAdjustment(priceM2, benchmark?.priceM2);

  return {
    priceM2: priceM2 ? Math.round(priceM2) : null,
    benchmarkPriceM2: benchmark?.priceM2 || null,
    benchmarkScore: benchmark?.score || null,
    adjustment,
    deltaPct: priceM2 && benchmark?.priceM2 ? round2(((priceM2 / benchmark.priceM2) - 1) * 100) : null,
    hasBenchmark: Boolean(benchmark),
    hasSurface: surface > 0,
  };
}

function getLocationScore(data) {
  const ville = typeof data === 'string' ? data : data?.ville;
  const canton = typeof data === 'string' ? null : data?.canton;
  const comparison = getMarketPriceM2Comparison(data);
  const benchmark = getMarketBenchmark(ville, canton);
  const baseScore = benchmark?.score ?? getLegacyLocationScore(ville);

  return Math.min(Math.max(baseScore + comparison.adjustment, 1), 15);
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
  const scoreEmplacement = getLocationScore(data);
  const scoreEtat = valEtat(data.etat_batiment);
  const marketPriceM2 = getMarketPriceM2Comparison(data);

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
    prix_m2_bien: marketPriceM2.priceM2,
    prix_m2_marche: marketPriceM2.benchmarkPriceM2,
    ecart_prix_m2_marche: marketPriceM2.deltaPct,
    impact_score_prix_m2: marketPriceM2.adjustment,
    note,
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

export function normalizeAnalysis(analysis, ville) {
  if (!analysis) return analysis;
  const context = typeof ville === 'string'
    ? { ville }
    : {
      ville: ville?.ville,
      canton: ville?.canton,
      surface: ville?.surface,
      annee_construction: ville?.annee_construction,
    };

  return {
    ...analysis,
    ...calculateAnalysis(ville ? { ...analysis, ...context } : analysis),
  };
}

export function normalizeAnalyses(analyses = [], property) {
  return analyses.map((a) => normalizeAnalysis(a, property));
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
