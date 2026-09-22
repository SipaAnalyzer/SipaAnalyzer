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
