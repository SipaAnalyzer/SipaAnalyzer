import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { buildAnalysisFromEstimation } from '../src/utils/quickEstimation.js';
import { readEstimationDraft, writeEstimationDraft } from '../src/utils/estimationDraft.js';

const estimation = { mode: 'price', rent: '100000', chargesPercent: '15', grossYield: '5' };
afterEach(() => { delete globalThis.window; });

test('transfers the computed price and annual charges, not the charges percentage', () => {
  const data = buildAnalysisFromEstimation(estimation, 'property-1');
  assert.equal(data.property_id, 'property-1');
  assert.equal(data.prix_bien, 2000000);
  assert.equal(data.prix_achat, 2000000);
  assert.equal(data.revenus_locatifs, 100000);
  assert.equal(data.charges_operationnelles, 15000);
  assert.equal(data.revenus_locatifs / data.prix_bien * 100, 5);
  assert.match(data.notes, /Prix cible calculé/);
  // Missing costs must remain to be completed, not silently inflate the price.
  assert.equal(data.target_benefice_sipa_fonds_propres_pct, null);
  assert.equal(data.honoraires_transaction_sipa_group_pct, null);
  assert.equal(data.hypotheque, undefined);
});

test('uses the entered acquisition price in yield mode, with French decimals', () => {
  const data = buildAnalysisFromEstimation({
    mode: 'yield', rent: '120 000', chargesPercent: '12,5', price: "2'400'000",
  }, 'property-2');
  assert.equal(data.prix_bien, 2400000);
  assert.equal(data.charges_operationnelles, 15000);
  assert.equal(data.revenus_locatifs / data.prix_bien * 100, 5);
  assert.doesNotMatch(data.notes, /Prix cible calculé/);
});

test('accepts zero charges but rejects invalid estimates or a missing property', () => {
  assert.equal(buildAnalysisFromEstimation({ ...estimation, chargesPercent: '0' }, 'p').charges_operationnelles, 0);
  assert.equal(buildAnalysisFromEstimation(estimation, ''), null);
  for (const change of [{ rent: '' }, { grossYield: '0' }, { chargesPercent: '101' }]) {
    assert.equal(buildAnalysisFromEstimation({ ...estimation, ...change }, 'p'), null);
  }
});

test('restores estimation, property and edited analysis after a module reload', async () => {
  const storage = new Map();
  globalThis.window = { sessionStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } };
  const property = { id: 'property-3', nom_bien: 'Résidence du Lac', ville: 'Lausanne' };
  const data = buildAnalysisFromEstimation(estimation, property.id);
  writeEstimationDraft('commercial-a', { values: estimation, createdProperty: property });
  writeEstimationDraft('commercial-a', { property, initialData: { ...data, interets_hypothecaires: 30000 } }, property.id);
  const reloaded = await import('../src/utils/estimationDraft.js?reload');
  assert.equal(reloaded.readEstimationDraft('commercial-a').createdProperty.id, property.id);
  assert.equal(reloaded.readEstimationDraft('commercial-a', property.id).initialData.interets_hypothecaires, 30000);
  assert.equal(reloaded.readEstimationDraft('commercial-b', property.id), null);
  assert.equal(reloaded.readEstimationDraft('commercial-a', 'other-property'), null);
});

test('retains the saved analysis marker separately from a new estimation', () => {
  writeEstimationDraft('commercial-c', { property: { id: 'p' }, analysisId: 'analysis-1' }, 'p');
  writeEstimationDraft('commercial-c', { values: {}, createdProperty: null });
  assert.equal(readEstimationDraft('commercial-c', 'p').analysisId, 'analysis-1');
  assert.equal(readEstimationDraft('commercial-c').createdProperty, null);
});

test('supports blocked storage and ignores malformed persisted drafts', () => {
  globalThis.window = { sessionStorage: {
    getItem: () => { throw new Error('Storage disabled'); },
    setItem: () => { throw new Error('Storage disabled'); },
  } };
  assert.equal(readEstimationDraft('no-storage'), null);
  writeEstimationDraft('no-storage', { createdProperty: { id: 'p' } });
  assert.equal(readEstimationDraft('no-storage').createdProperty.id, 'p');
  globalThis.window.sessionStorage.getItem = () => '{broken';
  assert.equal(readEstimationDraft('broken-storage'), null);
  globalThis.window.sessionStorage.getItem = () => '[]';
  assert.equal(readEstimationDraft('array-storage'), null);
});
