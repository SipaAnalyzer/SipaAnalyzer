export const SATISFACTORY_GROSS_YIELD = 4;

// Accept French decimals and Swiss thousands separators on mobile keyboards.
export function parseEstimationNumber(value) {
  const text = String(value ?? '').trim().replace(/[\s'’]/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function calculateQuickEstimation({ mode, rent, chargesPercent, price, grossYield }) {
  const annualRent = parseEstimationNumber(rent);
  const chargesRate = parseEstimationNumber(chargesPercent);
  const input = parseEstimationNumber(mode === 'price' ? grossYield : price);
  if (!['price', 'yield'].includes(mode) || annualRent === null || annualRent <= 0
    || chargesRate === null || chargesRate > 100 || input === null || input <= 0) return null;

  const estimatedPrice = mode === 'price' ? annualRent * 100 / input : input;
  const estimatedYield = mode === 'yield' ? annualRent / input * 100 : input;
  const charges = annualRent * chargesRate / 100;
  const incomeAfterCharges = annualRent - charges;
  const yieldAfterCharges = incomeAfterCharges / estimatedPrice * 100;
  const result = { price: estimatedPrice, grossYield: estimatedYield, charges, incomeAfterCharges, yieldAfterCharges };
  return Object.values(result).every(Number.isFinite) && estimatedPrice > 0 ? result : null;
}

export function buildAnalysisFromEstimation(estimation, propertyId) {
  const result = calculateQuickEstimation(estimation);
  if (!result || !propertyId) return null;
  return {
    property_id: propertyId,
    statut: 'en_cours',
    prix_bien: result.price,
    prix_achat: result.price,
    revenus_locatifs: parseEstimationNumber(estimation.rent),
    charges_operationnelles: result.charges,
    // These defaults would otherwise add a margin/fees on the first recalculation.
    // The quick estimate does not define them: leave them for the full analysis.
    target_benefice_sipa_fonds_propres_pct: null,
    honoraires_transaction_sipa_group_pct: null,
    notes: [
      'Analyse préparée depuis Test estimation.',
      estimation.mode === 'price'
        ? `Prix cible calculé pour un rendement brut de ${result.grossYield.toFixed(2)} % : à confirmer avec le vendeur.`
        : 'Prix d’acquisition envisagé saisi lors de l’estimation.',
      `Charges opérationnelles estimées à ${parseEstimationNumber(estimation.chargesPercent)} % des loyers annuels.`,
      'Financement, travaux, honoraires et fiscalité à compléter.',
    ].join('\n'),
  };
}

export function getYieldSuggestion(estimation) {
  const result = calculateQuickEstimation(estimation);
  if (!result || result.grossYield >= SATISFACTORY_GROSS_YIELD) return null;
  const annualRent = parseEstimationNumber(estimation.rent);
  // Round in the direction that actually reaches the target at whole-CHF precision.
  const maximumPrice = Math.floor(annualRent * 100 / SATISFACTORY_GROSS_YIELD);
  const minimumAnnualRent = Math.ceil(result.price * SATISFACTORY_GROSS_YIELD / 100);
  if (!Number.isFinite(maximumPrice) || !Number.isFinite(minimumAnnualRent)) return null;
  return { targetYield: SATISFACTORY_GROSS_YIELD, maximumPrice, minimumAnnualRent };
}
