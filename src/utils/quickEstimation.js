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
