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

  const prixBien = Number(prix_bien) || 0;
  const loyerAnnuel = Number(revenus_locatifs) || 0;
  const chargesPct = Number(charges_pct) || 0;
  const apportPct = Number(apport_pct) || 0;
  const taux = Number(taux_hypotheque) || 0;
  const duree = Math.max(0, Number(duree_pret) || 0);
  const fraisPct = Number(frais_acquisition_pct) || 0;
  const travauxVal = Number(travaux) || 0;
  const tauxImposition = Number(taux_imposition) || 20;

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
