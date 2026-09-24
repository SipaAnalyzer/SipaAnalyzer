import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getYieldSuggestion } from '../src/utils/quickEstimation.js';

const inputs = { mode: 'yield', rent: '60 000', price: '2 000 000', chargesPercent: '15' };

test('suggests price and rent targets for a yield below 4%', () => {
  assert.deepEqual(getYieldSuggestion(inputs), {
    targetYield: 4, maximumPrice: 1500000, minimumAnnualRent: 80000,
  });
});

test('supports target-price mode and French decimals', () => {
  assert.deepEqual(getYieldSuggestion({ ...inputs, mode: 'price', grossYield: '2,5' }), {
    targetYield: 4, maximumPrice: 1500000, minimumAnnualRent: 96000,
  });
});

test('no suggestion for invalid inputs or satisfactory yields', () => {
  for (const price of ['1500000', '1000000', '0', '']) {
    assert.equal(getYieldSuggestion({ ...inputs, price }), null);
  }
});

test('whole-CHF suggestions reach the target rather than rounding below it', () => {
  const result = getYieldSuggestion({ ...inputs, rent: '60000,03', price: '2000000,01' });
  assert.ok(60000.03 / result.maximumPrice * 100 >= 4);
  assert.ok(result.minimumAnnualRent / 2000000.01 * 100 >= 4);
});
