import * as XLSX from 'xlsx';

export function formatSipaValue(v) {
  if (!v) return '—';
  if (v.type === 'pct') return `${v.value}%`;
  if (v.type === 'amount') return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(v.value);
  return v.value;
}

export function formatSipaLabel(entry, entries = [], index = 0) {
  const label = entry?.label || '';
  if (getSipaSection(entry, entries, index) === 'commercialisation') return label;

  const normalized = normalizeText(label);
  if (normalized === 'prix total') return "Prix total d'acquisition";
  const translatedLabel = SIPA_LABEL_TRANSLATIONS[normalized];
  if (translatedLabel) return translatedLabel;
  if (normalized !== 'prix du bien') return label;

  const occurrence = entries
    .slice(0, index + 1)
    .filter((item) => normalizeText(item?.label) === 'prix du bien')
    .length;

  if (occurrence === 2) return "Prix d'achat";
  if (occurrence >= 3) return 'Prix total';
  return 'Prix bien';
}

export function getSipaDisplayValues(entry, entries = [], index = 0) {
  const label = formatSipaLabel(entry, entries, index);
  const hidePercent = label === 'Prix bien';
  const seenValues = new Set();
  const values = [];
  const percentages = [];

  (entry?.values || []).forEach((value) => {
    if (!value) return;
    if (value.type !== 'text' && Number(value.value || 0) === 0) return;
    if (value.type === 'pct') {
      if (!hidePercent) percentages.push(value);
      return;
    }

    const signature = `${value.type}:${value.value}`;
    if (label === "Prix d'achat" && seenValues.has(signature)) return;
    seenValues.add(signature);
    values.push(value);
  });

  return { values, percentages };
}

export function hasSipaDisplayValues(entry, entries = [], index = 0) {
  const display = getSipaDisplayValues(entry, entries, index);
  return [...display.values, ...display.percentages].some((value) => {
    if (value?.type === 'text') return String(value.value || '').trim() !== '';
    const numeric = Number(value?.value || 0);
    return Number.isFinite(numeric) && numeric !== 0;
  });
}

export function getDisplayableSipaRows(entries = []) {
  const source = entries.filter((entry) => !entry?._custom);
  return source
    .map((entry, index) => ({ entry, index, entries: source }))
    .filter(({ entry, entries, index }) => hasSipaDisplayValues(entry, entries, index));
}

export const SIPA_SECTION_LABELS = {
  commercialisation: 'Commercialisation du bien par SIPA Group',
  achat: 'Achat du bien par SIPA Group',
};

export function getSipaDisplayGroups(entries = []) {
  return Object.entries(SIPA_SECTION_LABELS)
    .map(([section, title]) => ({
      section,
      title,
      rows: getDisplayableSipaRows(entries).filter(({ entry, entries, index }) =>
        getSipaSection(entry, entries, index) === section
      ),
    }))
    .filter((group) => group.rows.length > 0);
}

export function syncSipaDataWithAnalysisFields(entries = [], analysis = {}) {
  if (!Array.isArray(entries)) return entries;

  return entries.map((entry, index) => {
    if (!entry || entry._custom) return entry;

    const section = getSipaSection(entry, entries, index);
    const normalizedLabel = normalizeText(entry.label);

    if (section === 'achat' && normalizedLabel === 'frais de transaction') {
      return {
        ...entry,
        values: buildSipaFinancialValues(entry, {
          amount: analysis.honoraires_sipa,
          pct: analysis.honoraires_sipa_pct,
        }),
      };
    }

    return entry;
  });
}

function buildSipaFinancialValues(entry, { amount, pct }) {
  const values = [];
  const numericPct = hasValue(pct) ? Number(pct) : NaN;
  const numericAmount = hasValue(amount) ? Number(amount) : NaN;

  if (Number.isFinite(numericPct)) values.push({ type: 'pct', value: Math.round(numericPct * 100) / 100 });
  if (Number.isFinite(numericAmount)) values.push({ type: 'amount', value: Math.round(numericAmount) });

  (entry.values || [])
    .filter((value) => value?.type === 'text')
    .forEach((value) => values.push(value));

  return values;
}

function getSipaSection(entry, entries = [], index = 0) {
  if (entry?._section) return entry._section;

  const priceOccurrences = entries
    .slice(0, index + 1)
    .filter((item) => normalizeText(item?.label) === 'prix du bien')
    .length;

  return priceOccurrences >= 2 ? 'achat' : 'commercialisation';
}

const SIPA_LABEL_TRANSLATIONS = {
  'target benefice sipa fonds prop': 'Objectif bénéfice SIPA sur fonds propres',
  'target benefice sipa fonds propres': 'Objectif bénéfice SIPA sur fonds propres',
  'sipa total': 'Total SIPA',
  'sipa of fonds prop': 'Part SIPA des fonds propres',
  'net yield our purchase price net revenue': "Rendement net sur prix d'achat",
  'bank loan to net income as': 'Revenu net / valorisation bancaire',
  'sipa trading': 'SIPA Trading',
  'sipa immo': 'SIPA Immobilier',
  'usb model': 'Modèle UBS',
  'of 1st mortgage': 'Part 1er rang hypothécaire',
  'of 2nd mortgage': 'Part 2e rang hypothécaire',
  'charge on rent': 'Charge sur loyer',
  'alt max mortgage shitty valuation': 'Hypothèque maximale alternative',
  'valuation banque': 'Valorisation bancaire',
  'vaulation banque': 'Valorisation bancaire',
};

export function parseNotesToRows(notes) {
  if (!notes) return [];
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      }
      return { key: '', value: line };
    });
}

const FIELD_DEFINITIONS = [
  { key: 'prix_bien', labels: ['prix du bien original', 'prix du bien', 'prix investor'], kind: 'amount' },
  { key: 'versement_initial', labels: ['versement initial sur le compte de la copropriete', 'versement initial sur le compte de la spv'], kind: 'amount' },
  { key: 'amortissement_5_ans', labels: ['amortissement sur 5 ans', 'amortization years'], kind: 'amount' },
  { key: 'honoraires_transaction_sipa_group', pctKey: 'honoraires_transaction_sipa_group_pct', labels: ['honoraires transaction sipa group', 'honoraires transaction sipa'], kind: 'amount' },
  { key: 'honoraires_sipa', pctKey: 'honoraires_sipa_pct', labels: ['frais de transaction'], kind: 'amount' },
  { key: 'construction', pctKey: 'construction_pct', labels: ['construction'], kind: 'amount' },
  { key: 'frais_dossier_bancaire', labels: ['frais de dossier bancaire', 'commission broker hypotheque', 'commission broker autres charges'], kind: 'amount' },
  { key: 'fonds_propres', labels: ['fonds propres', 'fond propre'], kind: 'amount' },
  { key: 'target_benefice_sipa_fonds_propres', pctKey: 'target_benefice_sipa_fonds_propres_pct', labels: ['target benefice sipa fonds prop', 'target benefice sipa fonds propres'], kind: 'amount' },
  { key: 'hypotheque', pctKey: 'hypotheque_pct', labels: ['hypotheque', 'hypotheque bancaire'], kind: 'amount' },
  { key: 'revenus_locatifs', labels: ['revenus locatifs annuels', 'revenus locatifs'], kind: 'amount' },
  { key: 'charges_operationnelles', labels: ['charges operationnelles', 'charges operationnells'], kind: 'amount' },
  { key: 'interets_hypothecaires', pctKey: 'interets_hypothecaires_pct', labels: ['interet hypothecaire', 'interets annuels'], kind: 'amount' },
  { key: 'gestion', pctKey: 'gestion_pct', labels: ['frais de gestion', 'honoraires de gestion', 'gestion'], kind: 'amount' },
  { key: 'impot', pctKey: 'impot_pct', labels: ['impot', 'taux d impot'], kind: 'amount' },
  { key: 'banque_a_taux_hypothecaire', labels: ['banque a taux hypothecaire'], kind: 'percent' },
  { key: 'banque_a_amortissement_annuel', labels: ['banque a amortissement annuel'], kind: 'amount' },
  { key: 'banque_a_evaluation', labels: ['banque a evaluation'], kind: 'text' },
  { key: 'banque_b_taux_hypothecaire', labels: ['banque b taux hypothecaire'], kind: 'percent' },
  { key: 'banque_b_amortissement_annuel', labels: ['banque b amortissement annuel'], kind: 'amount' },
  { key: 'banque_b_evaluation', labels: ['banque b evaluation'], kind: 'text' },
];

const PCT_LABELS = new Map([
  ['honoraires_transaction_sipa_group_pct', ['honoraires transaction sipa group', 'honoraires transaction sipa']],
  ['honoraires_sipa_pct', ['frais de transaction']],
  ['construction_pct', ['construction']],
  ['target_benefice_sipa_fonds_propres_pct', ['target benefice sipa fonds prop', 'target benefice sipa fonds propres']],
  ['hypotheque_pct', ['hypotheque']],
  ['interets_hypothecaires_pct', ['interet hypothecaire']],
  ['gestion_pct', ['frais de gestion', 'honoraires de gestion', 'gestion']],
  ['impot_pct', ['impot', 'taux d impot']],
]);

export async function extractAnalysisFieldsFromExcel(file, customLabels = [], preferredSheetTerms = []) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: false, cellText: false });

  const candidates = workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    const rows = rawRows.map((row) => (row && row.some((c) => c != null)) ? row : null);
    const fields = {};
    const seenLabels = [];

    extractRows(rows, fields, seenLabels);
    extractProjectionTables(rows, fields);
    applyDerivedPercentages(fields);

    return {
      sheetName,
      rows,
      fields,
      seenLabels,
      score: scoreImportedSheet(rows, fields, sheetName, preferredSheetTerms, index),
    };
  });

  const selected = candidates.sort((a, b) => b.score - a.score)[0] || {
    rows: [],
    fields: {},
    seenLabels: [],
    sheetName: null,
  };

  const fields = { ...selected.fields };
  const seenLabels = [...selected.seenLabels];
  const allRows = selected.rows;

  normalizeBlankOptionalFields(fields);
  applyDerivedPercentages(fields);

  const notes = extractMetadataNotes(allRows);
  if (notes) fields.notes = notes;

  const customFinancialFields = extractCustomFields(allRows, customLabels);

  const sipaData = extractSipaData(allRows);
  if (sipaData) fields.sipa_data = sipaData;

  if (customFinancialFields.length > 0) {
    fields.financial_custom_fields = customFinancialFields.map((cf, index) => ({
      id: `import-${Date.now().toString(36)}-${index}`,
      label: cf.name,
      amount: cf.amount ?? null,
      pct: cf.pct ?? null,
      insertAfter: cf.insertAfter || 'prix_total',
      position: index,
    }));
  }

  return {
    fields,
    importedCount: Object.keys(fields).length,
    seenLabels,
    customFinancialFields,
    sheetName: selected.sheetName,
  };
}

function normalizeBlankOptionalFields(fields) {
  if (Number(fields.honoraires_sipa || 0) === 0) {
    delete fields.honoraires_sipa;
    delete fields.honoraires_sipa_pct;
  }
  if (Number(fields.construction || 0) === 0) {
    delete fields.construction;
    delete fields.construction_pct;
  }
}

function scoreImportedSheet(rows, fields, sheetName, preferredSheetTerms = [], index = 0) {
  const fieldScore = Object.keys(fields).length * 10;
  const rowText = rows
    .filter(Boolean)
    .map((row) => row.map((cell) => normalizeText(cell)).filter(Boolean).join(' '))
    .join(' ');
  const sipaScore = rowText.includes('sipa group') ? 50 : 0;
  const projectionScore = fields.operating_projection ? 35 : 0;
  const capitalScore = fields.capital_projection ? 35 : 0;
  const brouillonPenalty = /brouillon|calcul/i.test(sheetName || '') ? 80 : 0;
  const sheetText = normalizeText(sheetName || '');
  const preferenceScore = preferredSheetTerms
    .map(normalizeText)
    .filter((term) => term.length >= 3)
    .reduce((bestScore, term) => Math.max(bestScore, getPreferredSheetScore(sheetText, term)), 0);
  const orderPenalty = index * 20;

  return fieldScore + sipaScore + projectionScore + capitalScore + preferenceScore - brouillonPenalty - orderPenalty;
}

function getPreferredSheetScore(sheetText, term) {
  if (sheetText === term) return 20000;
  if (sheetText.includes(term) || term.includes(sheetText)) return 10000;

  const sheetTokens = tokenizeSheetName(sheetText);
  const termTokens = tokenizeSheetName(term);
  if (!sheetTokens.length || !termTokens.length) return 0;

  const sheetSet = new Set(sheetTokens);
  const commonTokens = termTokens.filter((token) => sheetSet.has(token));
  const common = commonTokens.length;
  const hasNumberMatch = commonTokens.some((token) => /\d/.test(token));
  const commonTextTokens = commonTokens.filter((token) => !/\d/.test(token));
  const commonTextCount = commonTextTokens.length;
  const hasDistinctiveTextMatch = commonTextTokens.some((token) => isDistinctiveSheetToken(token));
  const termDistinctiveTextTokens = termTokens.filter((token) => !/\d/.test(token) && isDistinctiveSheetToken(token));
  const commonDistinctiveTextCount = commonTextTokens.filter((token) => isDistinctiveSheetToken(token)).length;
  const commonRatio = common / Math.min(sheetTokens.length, termTokens.length);

  if (termDistinctiveTextTokens.length >= 2 && commonDistinctiveTextCount === termDistinctiveTextTokens.length) {
    return 10000;
  }

  if ((hasNumberMatch && hasDistinctiveTextMatch) || (commonTextCount >= 3 && commonRatio >= 0.75)) {
    return 10000;
  }

  return 0;
}

const SHEET_TOKEN_STOPWORDS = new Set([
  'a', 'au', 'aux', 'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd',
  'rue', 'route', 'chemin', 'avenue', 'place', 'grand', 'grande',
]);

function tokenizeSheetName(text) {
  return text.split(' ').filter((token) => token.length >= 2);
}

function isDistinctiveSheetToken(token) {
  return token.length >= 3 && !SHEET_TOKEN_STOPWORDS.has(token);
}

function extractCustomFields(rows, customLabels) {
  if (!customLabels || !customLabels.length) return [];
  const matched = [];

  for (const label of customLabels) {
    const trimmed = label.trim();
    if (!trimmed) continue;

    const found = findLabelCell(rows, [trimmed]);
    if (!found) continue;

    const value = findNearbyValue(rows, found.row, found.col, 'amount');
    if (value != null) {
      const isPct = Math.abs(value) <= 100;
      matched.push({
        name: trimmed,
        amount: isPct ? 0 : Math.round(value),
        pct: isPct ? value : null,
      });
    }
  }

  return matched;
}

const METADATA_PATTERNS = [
  { regex: /^banque\s+(.+)/i, template: 'Banque : $1' },
  { regex: /cecb\s*(?:enveloppe)?\s*:?\s*([a-f])/i, template: 'CECB enveloppe : $1' },
  { regex: /construction\s+(\d{4})/i, template: 'Construction $1' },
  { regex: /^(residentiel|commercial|mixte|industriel)/i, template: '$1' },
  { regex: /(\d+)\s*app(?:artements?)?,?\s*(\d+)?\s*(?:pp\s*)?(?:ext?)?/i, template: '$1 app, $2 pp ext' },
  { regex: /chaudiere\s+(.+?)(?:\s+\d{4})?$/i, template: 'Chaudière $1' },
  { regex: /chaudiere\s+(.+)/i, template: 'Chaudière $1' },
  { regex: /(\d+[.,]\d+)\s*%\s*vacance/i, template: '$1% vacance' },
  { regex: /renov(?:ation)?\s+(.+)/i, template: 'Rénov $1' },
  { regex: /courtier\s*:?\s*(.+)/i, template: 'Courtier : $1' },
  { regex: /vente\s+(.+)/i, template: 'Vente $1' },
  { regex: /offre\s+indicative\s+(.+)/i, template: 'Offre indicative $1' },
];

const SIPA_LABELS = [
  'prix du bien', 'frais de transaction', 'construction', 'prix total',
  'fonds propres', 'hypotheque', 'valuation banque',
  'target benefice sipa', 'prix investor',
  'sipa total', 'sipa of fonds prop',
  'net yield', 'bank loan to net income',
  'sipa trading', 'sipa immo',
  'usb model', 'of 1st mortgage', 'of 2nd mortgage', 'charge on rent',
  'alt max mortgage',
];

function extractSipaData(rows) {
  const structuredEntries = extractStructuredSipaData(rows);
  if (structuredEntries.length) return structuredEntries;

  const entries = [];

  for (const row of rows) {
    if (!row) continue;
    for (let col = 0; col < row.length; col++) {
      const cell = row[col];
      if (!cell || typeof cell !== 'string') continue;
      const text = cell
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      if (!text) continue;

      const matched = SIPA_LABELS.some((label) => text.includes(label));
      if (!matched) continue;

      const values = [];
      for (let c = col + 1; c < Math.min(col + 6, row.length); c++) {
        const v = row[c];
        if (v == null || v === '') continue;
        const n = parseNumber(v);
        if (n != null) {
          values.push({ type: n <= 1 ? 'pct' : 'amount', value: Math.abs(n) <= 1 && n !== 0 ? round2(n * 100) : (n > 100 ? Math.round(n) : round2(n)) });
        } else if (typeof v === 'string' && v.trim()) {
          values.push({ type: 'text', value: v.trim() });
        }
      }

      if (values.length) {
        entries.push({ label: cell.trim(), values });
      }
    }
  }

  return entries.length ? entries : null;
}

function extractStructuredSipaData(rows) {
  const ranges = [
    { section: 'commercialisation', start: 0, end: 24 },
    { section: 'achat', start: 30, end: 74 },
  ];

  const entries = [];

  for (const range of ranges) {
    for (let rowIndex = range.start; rowIndex <= range.end && rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!row) continue;

      const labelCell = row[0];
      if (!labelCell || typeof labelCell !== 'string') continue;
      const label = labelCell.trim();
      if (!label) continue;

      const values = [];
      for (let col = 1; col <= 6 && col < row.length; col += 1) {
        const value = toSipaCellValue(row[col], col, label);
        if (value) values.push(value);
      }

      if (values.length) {
        entries.push({
          label,
          values,
          _section: range.section,
          _source_row: rowIndex + 1,
        });
      }
    }
  }

  return entries;
}

function toSipaCellValue(cellValue, colIndex, label) {
  if (cellValue == null || cellValue === '') return null;

  if (typeof cellValue === 'string') {
    const text = cellValue.trim();
    if (!text || text === '.') return null;
    const looksLikePercent = /^[-+]?\d+(?:[.,]\d+)?\s*%$/.test(text);
    const containsLetters = /[a-zA-ZÀ-ÿ]/.test(text);
    if (containsLetters && !looksLikePercent) return { type: 'text', value: text };
  }

  const parsed = parseNumber(cellValue);
  if (parsed == null) {
    const text = String(cellValue).trim();
    return text ? { type: 'text', value: text } : null;
  }

  const normalizedLabel = normalizeText(label);
  const value = Math.abs(parsed) <= 1 && parsed !== 0 ? round2(parsed * 100) : (Math.abs(parsed) > 100 ? Math.round(parsed) : round2(parsed));

  if (typeof cellValue === 'string' && cellValue.includes('%')) return { type: 'pct', value };
  if (Math.abs(parsed) <= 1 && parsed !== 0) return { type: 'pct', value };
  if (colIndex === 4 || Math.abs(parsed) > 100) return { type: 'amount', value };
  if (normalizedLabel.includes('hypotheque') || normalizedLabel.includes('rendement') || normalizedLabel.includes('benefice') || normalizedLabel.includes('charge on rent')) {
    return { type: 'pct', value };
  }
  return { type: 'number', value };
}

function extractMetadataNotes(rows) {
  const matched = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row) continue;
    for (const cell of row) {
      if (!cell || typeof cell !== 'string') continue;
      const raw = cell.trim();
      if (!raw || raw.length > 120) continue;

      const text = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      if (!text) continue;

      let found = false;

      for (const { regex, template } of METADATA_PATTERNS) {
        const match = text.match(regex);
        if (match) {
          let line = template;
          for (let i = 1; i < match.length; i++) {
            line = line.replace(`$${i}`, (match[i] || '').trim());
          }
          if (!seen.has(line)) {
            seen.add(line);
            matched.push(line);
          }
          found = true;
          break;
        }
      }

      if (found) continue;

      if (/^[a-z][^:]*\s*:/.test(text) && !/\d/.test(text.split(':')[1] || '')) {
        const parts = raw.split(/:(.+)/);
        if (parts.length >= 2 && parts[1].trim()) {
          const line = `${parts[0].trim()} : ${parts[1].trim()}`.replace(/\s+:/, ':');
          if (!seen.has(line)) {
            seen.add(line);
            matched.push(line);
          }
        }
      }
    }
  }

  return matched.length ? matched.join('\n') : null;
}

function extractProjectionTables(rows, fields) {
  const operating = buildOperatingProjection(rows);
  const capital = buildCapitalProjection(rows);

  if (operating) fields.operating_projection = operating;
  if (capital) fields.capital_projection = capital;
}

function buildOperatingProjection(rows) {
  const definitions = [
    { key: 'income', label: 'Revenus', aliases: ['income'], type: 'amount' },
    { key: 'costs', label: 'Coûts', aliases: ['costs'], type: 'amount' },
    { key: 'interest_rate', label: "Taux d'intérêt", aliases: ['interest rate'], type: 'percent' },
    { key: 'interest_paid', label: 'Intérêts payés', aliases: ['interest paid'], type: 'amount' },
    { key: 'ebt', label: 'Résultat avant impôt', aliases: ['ebt'], type: 'amount' },
    { key: 'tax', label: 'Impôt', aliases: ['tax'], type: 'amount' },
    { key: 'dividend', label: 'Dividende', aliases: ['dividend'], type: 'amount' },
  ];

  const projectionRows = definitions.map((definition) => {
    const found = findLabelCell(rows, definition.aliases);
    return {
      key: definition.key,
      label: definition.label,
      type: definition.type,
      values: found ? readRightValues(rows[found.row], found.col, 5, definition.type) : Array(5).fill(null),
    };
  });

  if (!projectionRows.some((row) => row.values.some(hasValue))) return null;

  return {
    columns: ['1', '2', '3', '4', '5'],
    rows: projectionRows,
  };
}

function buildCapitalProjection(rows) {
  const definitions = [
    { key: 'amortization', label: 'Amortissement dette', aliases: ['amortissement dette'], type: 'amount' },
    { key: 'debt', label: 'Dette', aliases: ['debt'], type: 'amount' },
    { key: 'value', label: 'Valeur', aliases: ['value'], type: 'amount' },
    { key: 'cashflow', label: 'Flux de trésorerie TRI', aliases: ['irr'], type: 'amount' },
    { key: 'dividend_yield', label: 'Rendement distribué', aliases: ['dividend yield'], type: 'percent' },
  ];

  const debtCell = findLabelCell(rows, ['debt']);
  const amortization = debtCell ? inferDebtAmortization(rows[debtCell.row], debtCell.col) : Array(6).fill(null);

  const projectionRows = definitions.map((definition) => {
    if (definition.key === 'amortization') {
      return { ...definition, values: amortization };
    }

    const found = findLabelCell(rows, definition.aliases);
    if (definition.key === 'cashflow') {
      return {
        ...definition,
        values: found ? readRightValues(rows[found.row], found.col, 7, definition.type).slice(1, 7) : Array(6).fill(null),
      };
    }
    if (definition.key === 'dividend_yield') {
      return {
        ...definition,
        values: found ? normalizeDividendYieldValues(readRightValues(rows[found.row], found.col, 7, definition.type)) : Array(6).fill(null),
      };
    }

    return {
      key: definition.key,
      label: definition.label,
      type: definition.type,
      values: found ? readRightValues(rows[found.row], found.col, 6, definition.type) : Array(6).fill(null),
    };
  });

  const priceIncrease = readFirstRightValue(rows, ['price increase'], 'percent');
  const salesPrice = readFirstRightValue(rows, ['sales price'], 'amount');
  const exitDebt = readFirstRightValue(rows, ['debt'], 'amount', { fromEnd: true });
  const net = readFirstRightValue(rows, ['net'], 'amount');
  const irr = readFirstRightValue(rows, ['irr'], 'percent');
  const averageDividendYield = readFirstRightValue(rows, ['dividend yield'], 'percent');

  const assumptions = {
    price_increase: priceIncrease,
    sales_price: salesPrice,
    exit_debt: exitDebt,
    net,
    irr,
    average_dividend_yield: averageDividendYield,
  };

  const hasRows = projectionRows.some((row) => row.values.some(hasValue));
  const hasAssumptions = Object.values(assumptions).some(hasValue);
  if (!hasRows && !hasAssumptions) return null;

  return {
    columns: ['0', '1', '2', '3', '4', '5'],
    rows: projectionRows,
    assumptions,
  };
}

function findLabelCell(rows, aliases) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const normalized = normalizeText(row[colIndex]);
      if (!normalized) continue;
      if (aliases.some((alias) => normalized === normalizeText(alias))) {
        return { row: rowIndex, col: colIndex };
      }
    }
  }

  return null;
}

function readRightValues(row = [], colIndex, count, type) {
  const values = [];

  for (let col = colIndex + 1; col < row.length && values.length < count; col += 1) {
    const parsed = parseProjectionValue(row[col], type);
    if (parsed != null) values.push(parsed);
  }

  while (values.length < count) values.push(null);
  return values;
}

function readFirstRightValue(rows, aliases, type, options = {}) {
  const found = options.fromEnd ? findLastLabelCell(rows, aliases) : findLabelCell(rows, aliases);
  if (!found) return null;

  const values = readRightValues(rows[found.row], found.col, 8, type).filter(hasValue);
  return options.fromEnd ? values[values.length - 1] ?? null : values[0] ?? null;
}

function findLastLabelCell(rows, aliases) {
  let latest = null;

  rows.forEach((row, rowIndex) => {
    row?.forEach((cell, colIndex) => {
      const normalized = normalizeText(cell);
      if (aliases.some((alias) => normalized === normalizeText(alias))) {
        latest = { row: rowIndex, col: colIndex };
      }
    });
  });

  return latest;
}

function inferDebtAmortization(row = [], debtCol) {
  const debt = readRightValues(row, debtCol, 6, 'amount');
  if (!debt.some(hasValue)) return Array(6).fill(null);

  return debt.map((value, index) => {
    if (index === 0 || !hasValue(value) || !hasValue(debt[index - 1])) return null;
    return Math.round(Number(debt[index - 1]) - Number(value));
  });
}

function normalizeDividendYieldValues(values) {
  const withoutAverage = values.slice(1);
  if (withoutAverage.length >= 6) return withoutAverage.slice(0, 6);
  return [null, ...withoutAverage].slice(0, 6);
}

function parseProjectionValue(value, type) {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  if (type === 'percent' && Math.abs(parsed) <= 1) return round2(parsed * 100);
  if (type === 'percent') return round2(parsed);
  return Math.round(parsed * 100) / 100;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function extractRows(rows, fields, seenLabels) {
  rows.forEach((row, rowIndex) => {
    if (!row) return;

    row.forEach((cellValue, colIndex) => {
      const label = normalizeText(cellValue);
      if (!label) return;

      if (matchesField(label, ['prix du bien']) && fields.prix_bien != null && fields.prix_achat == null) {
        const value = findPrimaryTableValue(rows, rowIndex, colIndex, 'amount') ??
          findNearbyValue(rows, rowIndex, colIndex, 'amount');
        if (value != null) {
          fields.prix_achat = normalizeFieldValue(value, 'amount');
          seenLabels.push(`${String(cellValue)} (prix d'achat)`);
          return;
        }
      }

      if (matchesField(label, ['fonds propres']) && fields.fonds_propres != null) {
        const value = findPrimaryTableValue(rows, rowIndex, colIndex, 'amount') ??
          findNearbyValue(rows, rowIndex, colIndex, 'amount');
        if (value != null) {
          fields.fonds_propres_achat = normalizeFieldValue(value, 'amount');
          seenLabels.push(`${String(cellValue)} (achat)`);
          return;
        }
      }

      if (matchesField(label, ['hypotheque']) && fields.hypotheque != null) {
        const percent = findPrimaryTablePercent(rows, rowIndex, colIndex, label) ??
          findNearbyPercent(rows, rowIndex, colIndex, label);
        if (percent != null) fields.hypotheque_pct = percent;
      }

      FIELD_DEFINITIONS.forEach((field) => {
        if (!matchesField(label, field.labels) || fields[field.key] != null) return;
        if (field.key === 'construction' && label !== 'construction') return;

        const value = findPrimaryTableValue(rows, rowIndex, colIndex, field.kind) ??
          findNearbyValue(rows, rowIndex, colIndex, field.kind);
        if (value == null) return;

        fields[field.key] = normalizeFieldValue(value, field.kind);
        seenLabels.push(String(cellValue));
      });

      PCT_LABELS.forEach((labels, pctKey) => {
        if (!matchesField(label, labels) || fields[pctKey] != null) return;

        const percent = findPrimaryTablePercent(rows, rowIndex, colIndex, label) ??
          findNearbyPercent(rows, rowIndex, colIndex, label);
        if (percent == null) return;

        fields[pctKey] = percent;
      });
    });
  });
}

function findPrimaryTableValue(rows, rowIndex, colIndex, kind) {
  if (kind !== 'amount' || colIndex !== 0 || rowIndex > 27) return null;

  const value = parseNumber(rows[rowIndex]?.[4]);
  return value == null ? null : value;
}

function findPrimaryTablePercent(rows, rowIndex, colIndex, label) {
  if (colIndex !== 0 || rowIndex > 27) return null;

  const labelPercent = extractPercent(label);
  if (labelPercent != null) return labelPercent;

  const value = parseNumber(rows[rowIndex]?.[2]);
  if (value == null) return null;
  return Math.abs(value) <= 1 ? round2(value * 100) : round2(value);
}

function matchesField(label, candidates) {
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    return label === normalizedCandidate || label.includes(normalizedCandidate);
  });
}

function findNearbyValue(rows, rowIndex, colIndex, kind) {
  const sameRowCandidates = [];

  for (let col = colIndex + 1; col <= colIndex + 6; col += 1) {
    sameRowCandidates.push(rows[rowIndex]?.[col]);
  }

  if (kind === 'text') {
    const textCandidate = sameRowCandidates.find((candidate) => candidate != null && candidate !== '');
    if (textCandidate != null) return String(textCandidate).trim();
  }

  const sameRowNumericCandidates = sameRowCandidates
    .map((candidate) => parseNumber(candidate))
    .filter((candidate) => candidate != null);

  if (sameRowNumericCandidates.length) {
    if (kind === 'amount') {
      return sameRowNumericCandidates.find((value) => Math.abs(value) > 100) ?? sameRowNumericCandidates[0];
    }

    return sameRowNumericCandidates[0];
  }

  const candidates = [];
  for (let row = rowIndex + 1; row <= rowIndex + 3; row += 1) {
    for (let col = colIndex; col <= colIndex + 4; col += 1) {
      candidates.push(rows[row]?.[col]);
    }
  }

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    if (kind === 'text') return String(candidate).trim();
  }

  const numericCandidates = [];
  for (const candidate of candidates) {
    const parsed = parseNumber(candidate);
    if (parsed != null) numericCandidates.push(parsed);
  }

  if (!numericCandidates.length) return null;
  if (kind === 'amount') {
    return numericCandidates.find((value) => Math.abs(value) > 100) ?? numericCandidates[0];
  }

  return numericCandidates[0];
}

function findNearbyPercent(rows, rowIndex, colIndex, label) {
  const labelPercent = extractPercent(label);
  if (labelPercent != null) return labelPercent;

  const candidates = [];
  for (let col = colIndex + 1; col <= colIndex + 3; col += 1) {
    candidates.push(rows[rowIndex]?.[col]);
  }

  for (const candidate of candidates) {
    const candidatePercent = extractPercent(candidate);
    if (candidatePercent != null) return candidatePercent;

    const parsed = parseNumber(candidate);
    if (parsed == null) continue;
    if (Math.abs(parsed) <= 1) return round2(parsed * 100);
    if (Math.abs(parsed) <= 100) return round2(parsed);
  }

  return null;
}

function normalizeFieldValue(value, kind) {
  if (kind === 'text') return value;
  if (kind === 'percent') return Math.abs(value) <= 1 ? round2(value * 100) : round2(value);
  return Math.round(value);
}

function applyDerivedPercentages(fields) {
  const purchasePrice = fields.prix_achat != null ? Number(fields.prix_achat || 0) : Number(fields.prix_bien || 0);

  if (fields.honoraires_sipa_pct == null && purchasePrice > 0 && fields.honoraires_sipa != null) {
    fields.honoraires_sipa_pct = round2((fields.honoraires_sipa / purchasePrice) * 100);
  }

  if (fields.construction_pct == null && purchasePrice > 0 && fields.construction != null) {
    fields.construction_pct = round2((fields.construction / purchasePrice) * 100);
  }

  const purchaseSubtotal = purchasePrice +
    Number(fields.honoraires_sipa || 0) +
    Number(fields.construction || 0);

  if (fields.hypotheque_pct == null && purchaseSubtotal > 0 && fields.hypotheque != null) {
    fields.hypotheque_pct = round2((fields.hypotheque / purchaseSubtotal) * 100);
  }

  if (
    fields.target_benefice_sipa_fonds_propres_pct == null &&
    (fields.fonds_propres_achat || fields.fonds_propres) > 0 &&
    fields.target_benefice_sipa_fonds_propres != null
  ) {
    const targetBase = Number(fields.fonds_propres_achat || fields.fonds_propres || 0);
    fields.target_benefice_sipa_fonds_propres_pct = round2(
      (fields.target_benefice_sipa_fonds_propres / targetBase) * 100
    );
  }

  if (fields.interets_hypothecaires_pct == null && fields.hypotheque > 0 && fields.interets_hypothecaires != null) {
    fields.interets_hypothecaires_pct = round2((fields.interets_hypothecaires / fields.hypotheque) * 100);
  }

  if (fields.honoraires_transaction_sipa_group_pct == null && fields.prix_bien > 0 && fields.honoraires_transaction_sipa_group != null) {
    fields.honoraires_transaction_sipa_group_pct = round2((fields.honoraires_transaction_sipa_group / fields.prix_bien) * 100);
  }

  if (fields.gestion_pct == null && fields.revenus_locatifs > 0 && fields.gestion != null) {
    fields.gestion_pct = round2((fields.gestion / fields.revenus_locatifs) * 100);
  }

  const revenuNetAvantImpot = Number(fields.revenus_locatifs || 0) -
    Number(fields.charges_operationnelles || 0) -
    Number(fields.interets_hypothecaires || 0) -
    Number(fields.gestion || 0);

  if (fields.impot_pct == null && revenuNetAvantImpot > 0 && fields.impot != null) {
    fields.impot_pct = round2((fields.impot / revenuNetAvantImpot) * 100);
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/[^\d.,'’+\-%\s]/g, '')
    .replace(/['’\s\u00a0\u202f]/g, '')
    .replace(',', '.')
    .replace('%', '');

  if (!/[-+]?\d/.test(cleaned)) return null;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPercent(value) {
  if (value == null) return null;
  const match = String(value).match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;
  return round2(Number(match[1].replace(',', '.')));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
