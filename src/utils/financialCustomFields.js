export const FINANCIAL_CUSTOM_FIELD_ANCHORS = [
  { key: 'prix_bien', label: 'Prix du bien' },
  { key: 'prix_achat', label: "Prix d'achat" },
  { key: 'honoraires_sipa', label: 'Frais de transaction' },
  { key: 'construction', label: 'Construction' },
  { key: 'fonds_propres_achat', label: 'Fonds propres achat' },
  { key: 'versement_initial', label: 'Versement initial sur le compte de la copropriete' },
  { key: 'amortissement_5_ans', label: 'Amortissement sur 5 ans' },
  { key: 'honoraires_transaction_sipa_group', label: 'Honoraires de transaction SIPA' },
  { key: 'frais_dossier_bancaire', label: 'Frais de dossier bancaire' },
  { key: 'prix_total', label: "Prix total d'acquisition" },
  { key: 'fonds_propres', label: 'Fonds propres' },
  { key: 'target_benefice_sipa_fonds_propres', label: 'Objectif benefice SIPA sur fonds propres' },
  { key: 'hypotheque', label: 'Hypotheque' },
  { key: 'revenus_locatifs', label: 'Revenus locatifs hors charges' },
  { key: 'rendement_brut', label: 'Taux de rendement brut' },
  { key: 'charges_operationnelles', label: 'Charges operationnelles' },
  { key: 'interets_hypothecaires', label: 'Interet hypothecaire moyen 5 ans' },
  { key: 'gestion', label: 'Honoraires de gestion' },
  { key: 'revenu_net', label: 'Revenu net' },
  { key: 'rendement_net_fonds_propres', label: 'Rendement net sur fonds propres' },
  { key: 'impot', label: 'Impot' },
  { key: 'revenu_distribue', label: 'Revenu distribue' },
  { key: 'revenu_distribue_fonds_propres', label: 'Revenu distribue sur fonds propres' },
];

const DEFAULT_INSERT_AFTER = 'prix_total';

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const legacySipaCustomFields = (sipaData = []) => {
  if (!Array.isArray(sipaData)) return [];

  return sipaData
    .filter((entry) => entry?._custom)
    .map((entry, index) => {
      const amount = entry.values?.find((value) => value.type === 'amount');
      const pct = entry.values?.find((value) => value.type === 'pct');
      return {
        id: entry.id || `legacy-${index}`,
        name: entry.label || '',
        amount: toNumberOrNull(amount?.value) ?? 0,
        pct: toNumberOrNull(pct?.value),
        insertAfter: entry.insertAfter || DEFAULT_INSERT_AFTER,
        position: index,
      };
    });
};

export function normalizeFinancialCustomFields(fields = [], legacySipaData = []) {
  const source = Array.isArray(fields) && fields.length > 0
    ? fields
    : legacySipaCustomFields(legacySipaData);

  return source
    .map((field, index) => ({
      id: field.id || `custom-${index}`,
      name: field.name || field.label || '',
      amount: toNumberOrNull(field.amount) ?? 0,
      pct: toNumberOrNull(field.pct),
      insertAfter: field.insertAfter || field.after || field.anchor || DEFAULT_INSERT_AFTER,
      position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
    }))
    .filter((field) => field.name.trim());
}

export function toPersistedFinancialCustomFields(fields = []) {
  return normalizeFinancialCustomFields(fields)
    .filter((field) => field.name.trim() && (toNumberOrNull(field.amount) !== null || toNumberOrNull(field.pct) !== null))
    .map((field, index) => ({
      id: field.id || `custom-${index}`,
      label: field.name.trim(),
      amount: toNumberOrNull(field.amount) ?? 0,
      pct: toNumberOrNull(field.pct),
      insertAfter: field.insertAfter || DEFAULT_INSERT_AFTER,
      position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
    }));
}

export function getCustomFieldsAfter(fields = [], anchorKey) {
  return normalizeFinancialCustomFields(fields)
    .filter((field) => (field.insertAfter || DEFAULT_INSERT_AFTER) === anchorKey)
    .sort((a, b) => a.position - b.position);
}
