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

export const FINANCIAL_CUSTOM_OPTIONAL_FIELD_ANCHORS = [
  { key: 'none', label: 'Sans' },
  ...FINANCIAL_CUSTOM_FIELD_ANCHORS,
];

const DEFAULT_INSERT_AFTER = 'prix_total';
const VALID_INSERT_AFTER_KEYS = new Set(FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => anchor.key));

export const FINANCIAL_CUSTOM_EFFECTS = [
  {
    key: 'acquisition_cost',
    label: "Cout d'acquisition",
    shortLabel: 'Ajoute au prix total',
    description: "Augmente le prix total d'acquisition, puis les fonds propres et ratios lies.",
  },
  {
    key: 'acquisition_discount',
    label: "Reduction d'acquisition",
    shortLabel: 'Retire du prix total',
    description: "Diminue le prix total d'acquisition, puis les fonds propres et ratios lies.",
  },
  {
    key: 'revenue',
    label: 'Revenu supplementaire',
    shortLabel: 'Ajoute aux revenus',
    description: 'Augmente les revenus locatifs, le revenu net et les rendements.',
  },
  {
    key: 'revenue_deduction',
    label: 'Baisse de revenu',
    shortLabel: 'Retire des revenus',
    description: 'Diminue les revenus locatifs, le revenu net et les rendements.',
  },
  {
    key: 'operating_expense',
    label: "Charge d'exploitation",
    shortLabel: 'Deduit du revenu net',
    description: 'Diminue le revenu net, le revenu distribue et les rendements.',
  },
  {
    key: 'operating_expense_credit',
    label: "Reduction de charge",
    shortLabel: 'Ajoute au revenu net',
    description: 'Diminue les charges et augmente le revenu net, le revenu distribue et les rendements.',
  },
  {
    key: 'equity_increase',
    label: 'Fonds propres en plus',
    shortLabel: 'Augmente les FP',
    description: 'Augmente les fonds propres et diminue la part financee par hypotheque.',
  },
  {
    key: 'equity_decrease',
    label: 'Fonds propres en moins',
    shortLabel: 'Diminue les FP',
    description: 'Diminue les fonds propres et augmente la part financee par hypotheque.',
  },
  {
    key: 'mortgage_increase',
    label: 'Hypotheque en plus',
    shortLabel: "Augmente l'hypotheque",
    description: "Augmente l'hypotheque et diminue les fonds propres.",
  },
  {
    key: 'mortgage_decrease',
    label: 'Hypotheque en moins',
    shortLabel: "Diminue l'hypotheque",
    description: "Diminue l'hypotheque et augmente les fonds propres.",
  },
  {
    key: 'operating_charge_increase',
    label: 'Charge operationnelle en plus',
    shortLabel: 'Augmente les charges',
    description: 'Augmente les charges operationnelles et diminue le revenu net.',
  },
  {
    key: 'operating_charge_decrease',
    label: 'Charge operationnelle en moins',
    shortLabel: 'Diminue les charges',
    description: 'Diminue les charges operationnelles et augmente le revenu net.',
  },
  {
    key: 'tax_expense',
    label: 'Impot / distribution',
    shortLabel: 'Deduit du distribue',
    description: 'Diminue uniquement le revenu distribue et le rendement distribue.',
  },
  {
    key: 'tax_credit',
    label: "Reduction d'impot",
    shortLabel: 'Ajoute au distribue',
    description: 'Diminue les impots et augmente uniquement le revenu distribue.',
  },
  {
    key: 'tax_increase',
    label: 'Impot en plus',
    shortLabel: "Augmente l'impot",
    description: "Augmente l'impot et diminue le revenu distribue.",
  },
  {
    key: 'tax_decrease',
    label: 'Impot en moins',
    shortLabel: "Diminue l'impot",
    description: "Diminue l'impot et augmente le revenu distribue.",
  },
  {
    key: 'display_only',
    label: 'Sans',
    shortLabel: 'Sans',
    description: 'Affiche la ligne sans modifier les resultats financiers.',
  },
];

export const DEFAULT_CUSTOM_EFFECT = 'acquisition_cost';
const VALID_EFFECT_KEYS = new Set(FINANCIAL_CUSTOM_EFFECTS.map((effect) => effect.key));

export const FINANCIAL_CUSTOM_FIELD_PRESETS = [
  {
    key: 'free',
    label: 'Champ libre',
  },
  {
    key: 'impot_capital_dissimule_vs',
    label: 'Impot sur le capital dissimule (VS)',
    insertAfter: 'impot',
    calculationEffect: 'tax_increase',
    baseField: 'fonds_propres',
    pct: 0.1,
  },
  {
    key: 'impot_foncier',
    label: 'Impot foncier',
    insertAfter: 'impot',
    calculationEffect: 'tax_increase',
    baseField: 'prix_bien',
    pct: 0.1,
  },
  {
    key: 'taxe_communale',
    label: 'Taxe communale',
    insertAfter: 'impot',
    calculationEffect: 'tax_increase',
    baseField: 'revenu_net',
    pct: 1,
  },
  {
    key: 'provision_travaux',
    label: 'Provision travaux',
    insertAfter: 'charges_operationnelles',
    calculationEffect: 'operating_expense',
    baseField: 'revenus_locatifs',
    pct: 5,
  },
  {
    key: 'autre_charge_exploitation',
    label: "Autre charge d'exploitation",
    insertAfter: 'charges_operationnelles',
    calculationEffect: 'operating_expense',
    baseField: 'revenus_locatifs',
    pct: null,
  },
  {
    key: 'autre_revenu',
    label: 'Autre revenu',
    insertAfter: 'revenus_locatifs',
    calculationEffect: 'revenue',
    baseField: 'revenus_locatifs',
    pct: null,
  },
];

export const FINANCIAL_CUSTOM_FORMULAS = [
  {
    key: 'none',
    label: 'Sans',
    shortLabel: 'Sans',
    description: 'Aucune formule automatique. Seul le montant saisi est utilise.',
  },
  {
    key: 'manual_or_pct',
    label: 'Montant ou % simple',
    shortLabel: 'Montant / %',
    description: 'Montant saisi, ou Champ A x % si seul un pourcentage est renseigne.',
  },
  {
    key: 'multiply_pct',
    label: 'Multiplier un champ par un %',
    shortLabel: 'A x %',
    description: 'Comme Honoraires = Prix du bien x 5%.',
  },
  {
    key: 'ratio',
    label: 'Calculer un ratio',
    shortLabel: 'A / B',
    description: 'Comme Rendement = Revenu net / Fonds propres.',
  },
  {
    key: 'sum',
    label: 'Additionner deux champs',
    shortLabel: 'A + B',
    description: 'Comme SIPA total = Target benefice + Honoraires.',
  },
  {
    key: 'subtract',
    label: 'Soustraire deux champs',
    shortLabel: 'A - B',
    description: 'Comme Fonds propres = Prix total - Hypotheque.',
  },
  {
    key: 'difference',
    label: 'Calculer un reste',
    shortLabel: 'Reste A - B',
    description: 'Comme SIPA Immo = SIPA total - SIPA Trading.',
  },
  {
    key: 'mortgage_capacity',
    label: 'Capacite hypothecaire',
    shortLabel: '(A / %) x %',
    description: 'Comme Alt Max mortgage = (revenus / taux) x quotite.',
  },
  {
    key: 'replace',
    label: 'Remplacer par un champ',
    shortLabel: 'Remplace',
    description: 'Utilise la valeur du Champ A au lieu du montant saisi.',
  },
];

export const DEFAULT_CUSTOM_FORMULA = 'manual_or_pct';
const VALID_FORMULA_KEYS = new Set(FINANCIAL_CUSTOM_FORMULAS.map((formula) => formula.key));

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

const EFFECT_ANCHORS = {
  acquisition_cost: FINANCIAL_CUSTOM_ACQUISITION_ANCHORS,
  acquisition_discount: FINANCIAL_CUSTOM_ACQUISITION_ANCHORS,
  revenue: FINANCIAL_CUSTOM_REVENUE_ANCHORS,
  revenue_deduction: FINANCIAL_CUSTOM_REVENUE_ANCHORS,
  operating_expense: FINANCIAL_CUSTOM_OPERATING_EXPENSE_ANCHORS,
  operating_expense_credit: FINANCIAL_CUSTOM_OPERATING_EXPENSE_ANCHORS,
  operating_charge_increase: FINANCIAL_CUSTOM_OPERATING_EXPENSE_ANCHORS,
  operating_charge_decrease: FINANCIAL_CUSTOM_OPERATING_EXPENSE_ANCHORS,
  tax_expense: FINANCIAL_CUSTOM_TAX_EXPENSE_ANCHORS,
  tax_credit: FINANCIAL_CUSTOM_TAX_EXPENSE_ANCHORS,
  tax_increase: FINANCIAL_CUSTOM_TAX_EXPENSE_ANCHORS,
  tax_decrease: FINANCIAL_CUSTOM_TAX_EXPENSE_ANCHORS,
  equity_increase: ['fonds_propres'],
  equity_decrease: ['fonds_propres'],
  mortgage_increase: ['hypotheque'],
  mortgage_decrease: ['hypotheque'],
};

const EFFECT_GROUPS = {
  acquisition_cost: 'acquisition',
  acquisition_discount: 'acquisition',
  revenue: 'revenue',
  revenue_deduction: 'revenue',
  operating_expense: 'operating_expense',
  operating_expense_credit: 'operating_expense',
  operating_charge_increase: 'operating_charge',
  operating_charge_decrease: 'operating_charge',
  tax_expense: 'tax_expense',
  tax_credit: 'tax_expense',
  tax_increase: 'tax_line',
  tax_decrease: 'tax_line',
  equity_increase: 'equity',
  equity_decrease: 'equity',
  mortgage_increase: 'mortgage',
  mortgage_decrease: 'mortgage',
};

const EFFECT_SIGNS = {
  acquisition_cost: 1,
  acquisition_discount: -1,
  revenue: 1,
  revenue_deduction: -1,
  operating_expense: 1,
  operating_expense_credit: -1,
  operating_charge_increase: 1,
  operating_charge_decrease: -1,
  tax_expense: 1,
  tax_credit: -1,
  tax_increase: 1,
  tax_decrease: -1,
  equity_increase: 1,
  equity_decrease: -1,
  mortgage_increase: 1,
  mortgage_decrease: -1,
  display_only: 0,
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeInsertAfter = (value) => {
  const key = value || DEFAULT_INSERT_AFTER;
  return VALID_INSERT_AFTER_KEYS.has(key) ? key : DEFAULT_INSERT_AFTER;
};

const normalizeEffect = (value) => (
  VALID_EFFECT_KEYS.has(value) ? value : DEFAULT_CUSTOM_EFFECT
);

const normalizeFormula = (value) => (
  VALID_FORMULA_KEYS.has(value) ? value : DEFAULT_CUSTOM_FORMULA
);

const inferEffectFromAnchor = (anchorKey) => {
  const normalizedAnchor = normalizeInsertAfter(anchorKey);
  const match = Object.entries(EFFECT_ANCHORS).find(([, anchors]) => anchors.includes(normalizedAnchor));
  return match?.[0] || DEFAULT_CUSTOM_EFFECT;
};

const normalizeBaseField = (value, fallback) => {
  if (value === 'none') return 'none';
  return normalizeInsertAfter(value || fallback);
};

const getEffectForAnchors = (anchors = FINANCIAL_CUSTOM_ACQUISITION_ANCHORS) => {
  const anchorSet = new Set(anchors);
  return Object.entries(EFFECT_ANCHORS).find(([, effectAnchors]) =>
    effectAnchors.length === anchors.length && effectAnchors.every((anchor) => anchorSet.has(anchor))
  )?.[0] || DEFAULT_CUSTOM_EFFECT;
};

const getEffectGroupForAnchors = (anchors = FINANCIAL_CUSTOM_ACQUISITION_ANCHORS) => (
  EFFECT_GROUPS[getEffectForAnchors(anchors)] || EFFECT_GROUPS[DEFAULT_CUSTOM_EFFECT]
);

const getSignedCustomFieldAmount = (field, data = {}) => {
  const sign = EFFECT_SIGNS[field.calculationEffect] ?? 1;
  return sign * Number(getFinancialCustomFieldAmount(field, data) || 0);
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
        calculationEffect: inferEffectFromAnchor(entry.insertAfter),
        calculationFormula: DEFAULT_CUSTOM_FORMULA,
        baseField: normalizeBaseField(entry.baseField, entry.insertAfter),
        secondaryField: normalizeBaseField(entry.secondaryField, entry.insertAfter),
        multiplierPct: null,
        position: index,
      };
    });
};

export function normalizeFinancialCustomFields(fields = [], legacySipaData = []) {
  const source = Array.isArray(fields) && fields.length > 0
    ? fields
    : legacySipaCustomFields(legacySipaData);

  return source
    .map((field, index) => {
      const insertAfter = normalizeInsertAfter(field.insertAfter || field.after || field.anchor);
      const explicitEffect = field.calculationEffect || field.effect || field.impact;
      const calculationEffect = explicitEffect ? normalizeEffect(explicitEffect) : inferEffectFromAnchor(insertAfter);
      const baseField = normalizeBaseField(field.baseField === 'none' ? insertAfter : field.baseField || field.calculationBase, insertAfter);
      return {
        id: field.id || `custom-${index}`,
        name: field.name || field.label || '',
        presetKey: field.presetKey || field.templateKey || 'free',
        amount: toNumberOrNull(field.amount),
        pct: toNumberOrNull(field.pct),
        insertAfter,
        calculationEffect,
        calculationFormula: normalizeFormula(field.calculationFormula || field.formulaType || field.formula),
        baseField,
        secondaryField: normalizeBaseField(field.secondaryField || field.secondField || field.fieldB, baseField),
        multiplierPct: toNumberOrNull(field.multiplierPct),
        position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
      };
    })
    .filter((field) => field.name.trim());
}

export function toPersistedFinancialCustomFields(fields = [], data = {}) {
  return normalizeFinancialCustomFields(fields)
    .map((field, index) => {
      const pct = toNumberOrNull(field.pct);
      const explicitAmount = toNumberOrNull(field.amount);
      return {
        id: field.id || `custom-${index}`,
        label: field.name.trim(),
        presetKey: field.presetKey || 'free',
        amount: explicitAmount,
        pct,
        insertAfter: normalizeInsertAfter(field.insertAfter),
        calculationEffect: normalizeEffect(field.calculationEffect),
        calculationFormula: normalizeFormula(field.calculationFormula),
        baseField: normalizeBaseField(field.baseField, field.insertAfter),
        secondaryField: normalizeBaseField(field.secondaryField, field.baseField || field.insertAfter),
        multiplierPct: toNumberOrNull(field.multiplierPct),
        position: Number.isFinite(Number(field.position)) ? Number(field.position) : index,
      };
    })
    .filter((field) => field.label);
}

export function getCustomFieldsAfter(fields = [], anchorKey) {
  return normalizeFinancialCustomFields(fields)
    .filter((field) => (field.insertAfter || DEFAULT_INSERT_AFTER) === anchorKey)
    .sort((a, b) => a.position - b.position);
}

export function getFinancialCustomFieldBase(field, data = {}) {
  const key = normalizeBaseField(field?.baseField, field?.insertAfter);
  if (key === 'none') return 0;
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
  const formula = normalizeFormula(field?.calculationFormula);
  if (formula === 'none' && amount !== null) return amount;
  if (amount !== null && formula === DEFAULT_CUSTOM_FORMULA) return amount;

  const pct = toNumberOrNull(field?.pct);
  const base = getFinancialCustomFieldBase(field, data);
  const secondary = getFinancialCustomFieldBase(
    { baseField: field?.secondaryField, insertAfter: field?.baseField || field?.insertAfter },
    data
  );
  const multiplierPct = toNumberOrNull(field?.multiplierPct);

  if (formula === 'replace') return base;
  if (formula === 'sum') return Math.round(base + secondary);
  if (formula === 'subtract' || formula === 'difference') return Math.round(base - secondary);
  if (formula === 'ratio') return secondary ? Math.round((base / secondary) * 10000) / 100 : null;
  if (formula === 'mortgage_capacity') {
    const rate = pct ?? 0;
    const loanToValue = multiplierPct ?? 75;
    return rate ? Math.round((base / (rate / 100)) * (loanToValue / 100)) : null;
  }
  if (pct === null) return amount;

  return Math.round(base * pct) / 100;
}

export function getFinancialCustomFieldsTotal(fields = [], data = {}, anchors = FINANCIAL_CUSTOM_ACQUISITION_ANCHORS) {
  const expectedEffectGroup = getEffectGroupForAnchors(anchors);
  const acceptedAnchors = new Set(anchors);
  return normalizeFinancialCustomFields(fields)
    .filter((field) => {
      if (field.calculationEffect === 'display_only') return false;
      if (field.calculationEffect) return EFFECT_GROUPS[field.calculationEffect] === expectedEffectGroup;
      return acceptedAnchors.has(field.insertAfter || DEFAULT_INSERT_AFTER);
    })
    .reduce((total, field) => total + getSignedCustomFieldAmount(field, data), 0);
}

export function getFinancialCustomFieldsTotalByGroup(fields = [], data = {}, effectGroup) {
  return normalizeFinancialCustomFields(fields)
    .filter((field) => {
      if (field.calculationEffect === 'display_only') return false;
      return EFFECT_GROUPS[field.calculationEffect] === effectGroup;
    })
    .reduce((total, field) => total + getSignedCustomFieldAmount(field, data), 0);
}
