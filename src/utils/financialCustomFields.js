export const FINANCIAL_CUSTOM_FIELD_ANCHORS = [
  { key: 'prix_bien', label: 'Prix du bien' },
  { key: 'prix_achat', label: "Prix d'achat" },
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
const VALID_INSERT_AFTER_KEYS = new Set(FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => anchor.key));

export const FINANCIAL_CUSTOM_ACQUISITION_ANCHORS = [
  'prix_bien',
  'prix_achat',
  'construction',
  'fonds_propres_achat',
  'versement_initial',
  'amortissement_5_ans',
  'honoraires_transaction_sipa_group',
  'frais_dossier_bancaire',
  'prix_total',
];

export const FINANCIAL_CUSTOM_REVENUE_ANCHORS = [
  'revenus_locatifs',
];

export const FINANCIAL_CUSTOM_OPERATING_EXPENSE_ANCHORS = [
  'charges_operationnelles',
  'interets_hypothecaires',
  'gestion',
  'revenu_net',
];

export const FINANCIAL_CUSTOM_TAX_EXPENSE_ANCHORS = [
  'impot',
  'revenu_distribue',
];

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeInsertAfter = (value) => {
  const key = value || DEFAULT_INSERT_AFTER;
  return VALID_INSERT_AFTER_KEYS.has(key) ? key : DEFAULT_INSERT_AFTER;
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
        amount: toNumberOrNull(amount?.value),
        pct: toNumberOrNull(pct?.value),
        insertAfter: normalizeInsertAfter(entry.insertAfter),
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
      amount: toNumberOrNull(field.amount),
      pct: toNumberOrNull(field.pct),
      insertAfter: normalizeInsertAfter(field.insertAfter || field.after || field.anchor),
      position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
    }))
    .filter((field) => field.name.trim());
}

export function toPersistedFinancialCustomFields(fields = [], data = {}) {
  return normalizeFinancialCustomFields(fields)
    .map((field, index) => {
      const pct = toNumberOrNull(field.pct);
      const explicitAmount = toNumberOrNull(field.amount);
      const computedAmount = explicitAmount ?? getFinancialCustomFieldAmount(field, data);
      return {
        id: field.id || `custom-${index}`,
        label: field.name.trim(),
        amount: computedAmount,
        pct,
        insertAfter: normalizeInsertAfter(field.insertAfter),
        position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
      };
    })
    .filter((field) => field.label && (toNumberOrNull(field.amount) !== null || toNumberOrNull(field.pct) !== null));
}

export function getCustomFieldsAfter(fields = [], anchorKey) {
  return normalizeFinancialCustomFields(fields)
    .filter((field) => (field.insertAfter || DEFAULT_INSERT_AFTER) === anchorKey)
    .sort((a, b) => a.position - b.position);
}

export function getFinancialCustomFieldBase(field, data = {}) {
  const key = field?.insertAfter || DEFAULT_INSERT_AFTER;
  if (key === 'prix_achat') return toNumberOrNull(data.prix_achat) ?? toNumberOrNull(data.prix_bien) ?? 0;
  if (key === 'prix_total') return toNumberOrNull(data.prix_total) ?? 0;
  if (key === 'fonds_propres_achat') return toNumberOrNull(data.fonds_propres_achat) ?? 0;
  if (key === 'rendement_brut') return toNumberOrNull(data.rendement_brut) ?? 0;
  if (key === 'revenu_net') return toNumberOrNull(data.revenu_net) ?? 0;
  if (key === 'rendement_net_fonds_propres') return toNumberOrNull(data.rendement_net_fonds_propres) ?? 0;
  if (key === 'revenu_distribue') return toNumberOrNull(data.revenu_distribue) ?? 0;
  if (key === 'revenu_distribue_fonds_propres') return toNumberOrNull(data.revenu_distribue_fonds_propres) ?? 0;
  return toNumberOrNull(data[key]) ?? 0;
}

export function getFinancialCustomFieldAmount(field, data = {}) {
  const amount = toNumberOrNull(field?.amount);
  if (amount !== null) return amount;

  const pct = toNumberOrNull(field?.pct);
  if (pct === null) return null;

  const base = getFinancialCustomFieldBase(field, data);
  return Math.round(base * pct) / 100;
}

export function getFinancialCustomFieldsTotal(fields = [], data = {}, anchors = FINANCIAL_CUSTOM_ACQUISITION_ANCHORS) {
  const acceptedAnchors = new Set(anchors);
  return normalizeFinancialCustomFields(fields)
    .filter((field) => acceptedAnchors.has(field.insertAfter || DEFAULT_INSERT_AFTER))
    .reduce((total, field) => total + Number(getFinancialCustomFieldAmount(field, data) || 0), 0);
}
