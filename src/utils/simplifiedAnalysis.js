import { calculateAnalysis } from './calculations';

function toNumber(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function calculateSimplifiedAnalysis(inputs) {
  const {
    prix_bien,
    revenus_locatifs,
    charges_pct,
    apport_pct,
    taux_hypotheque,
    duree_pret,
    frais_acquisition_pct,
    travaux,
    taux_imposition = 20,
  } = inputs;

  const prixBien = toNumber(prix_bien);
  const loyerAnnuel = toNumber(revenus_locatifs);
  const chargesPct = toNumber(charges_pct);
  const apportPct = toNumber(apport_pct);
  const taux = toNumber(taux_hypotheque);
  const duree = Math.max(0, toNumber(duree_pret));
  const fraisPct = toNumber(frais_acquisition_pct);
  const travauxVal = toNumber(travaux);
  const tauxImposition = toNumber(taux_imposition, 20);

  const fraisAcquisition = prixBien * fraisPct / 100;
  const prixTotal = prixBien + fraisAcquisition + travauxVal;
  const apportPersonnel = prixBien * apportPct / 100;
  const emprunt = Math.max(0, prixTotal - apportPersonnel);

  const chargesAnnuelles = loyerAnnuel * chargesPct / 100;
  const interetsAnnuels = emprunt * taux / 100;

  const revenuNet = loyerAnnuel - chargesAnnuelles - interetsAnnuels;

  const rendementBrut = prixBien > 0 ? (loyerAnnuel / prixBien) * 100 : 0;
  const rendementNet = prixBien > 0 ? (revenuNet / prixBien) * 100 : 0;

  const impotEstime = Math.max(0, revenuNet * tauxImposition / 100);
  const cashFlowAnnuel = revenuNet - impotEstime;

  const amortissementAnnuel = duree > 0 ? Math.round(emprunt / duree) : 0;

  return {
    prixBien,
    fraisAcquisition,
    travaux: travauxVal,
    prixTotal,
    apportPersonnel,
    emprunt,
    chargesAnnuelles,
    interetsAnnuels,
    revenuNet,
    rendementBrut,
    rendementNet,
    impotEstime,
    cashFlowAnnuel,
    amortissementAnnuel,
  };
}

// Read-only Essentials projection of an already-saved analysis.
// Reuses the default logic (calculateAnalysis) for revenu net, brut, impot
// and score, then applies the simplified definitions:
//   rendementNet = revenuNet / prixBien (same base as rendement brut),
//   cashFlow     = revenu distribué (revenu net − impôt).
// No DB writes, no stored fields modified.
export function getEssentialsViewForAnalysis(analysisRaw, property) {
  if (!analysisRaw) return null;
  const context = property
    ? {
      ville: property.ville,
      canton: property.canton,
      surface: property.surface,
      annee_construction: property.annee_construction,
    }
    : {};
  const calc = calculateAnalysis({ ...analysisRaw, ...context });
  const prixBien = Number(analysisRaw.prix_bien || 0);
  const revenuNet = Number(calc.revenu_net || 0);
  const rendementNet = prixBien > 0 ? Math.round((revenuNet / prixBien) * 100 * 100) / 100 : 0;

  return {
    prixBien,
    loyerAnnuel: Number(analysisRaw.revenus_locatifs || 0),
    chargesAnnuelles: Number(analysisRaw.charges_operationnelles || 0),
    interetsAnnuels: Number(analysisRaw.interets_hypothecaires || 0),
    apportPersonnel: Number(analysisRaw.fonds_propres || 0),
    emprunt: Number(analysisRaw.hypotheque || 0),
    revenuNet,
    rendementBrut: Number(calc.rendement_brut || 0),
    rendementNet,
    impotEstime: revenuNet - Number(calc.revenu_distribue || 0),
    cashFlowAnnuel: Number(calc.revenu_distribue || 0),
    scoreGlobal: Number(calc.score_global || 0),
    note: calc.note,
  };
}

export function validateSimplifiedAnalysis(result) {
  const errors = [];
  if (result.rendementNet > result.rendementBrut) {
    errors.push('rendementNet doit être <= rendementBrut');
  }
  if (result.emprunt < 0) errors.push('emprunt doit être >= 0');
  if (result.chargesAnnuelles < 0) errors.push('chargesAnnuelles doit être >= 0');
  if (result.interetsAnnuels < 0) errors.push('interetsAnnuels doit être >= 0');
  if (result.impotEstime < 0) errors.push('impotEstime doit être >= 0');
  return errors;
}
