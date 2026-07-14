import * as XLSX from 'xlsx';

export function formatSipaValue(v) {
  if (!v) return '—';
  if (v.type === 'pct') return `${v.value}%`;
  if (v.type === 'amount') return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(v.value);
  return v.value;
}

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
  { key: 'honoraires_sipa', pctKey: 'honoraires_sipa_pct', labels: ['honoraires transaction sipa', 'frais de transaction'], kind: 'amount' },
  { key: 'frais_dossier_bancaire', labels: ['frais de dossier bancaire', 'commission broker hypotheque', 'commission broker autres charges'], kind: 'amount' },
  { key: 'fonds_propres', labels: ['fonds propres', 'fond propre'], kind: 'amount' },
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
  ['honoraires_sipa_pct', ['honoraires transaction sipa', 'frais de transaction']],
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

  applyDerivedPercentages(fields);

  const notes = extractMetadataNotes(allRows);
  if (notes) fields.notes = notes;

  const customFinancialFields = extractCustomFields(allRows, customLabels);

  const sipaData = extractSipaData(allRows);
  if (sipaData) fields.sipa_data = sipaData;

  // Merge custom fields into sipa_data for persistence
  if (customFinancialFields.length > 0) {
    const customSipaEntries = customFinancialFields.map((cf) => ({
      label: cf.name,
      values: [
        { type: 'amount', value: cf.amount },
        ...(cf.pct != null ? [{ type: 'pct', value: cf.pct }] : []),
      ],
      _custom: true,
    }));
    fields.sipa_data = [...(fields.sipa_data || []), ...customSipaEntries];
  }

  return {
    fields,
    importedCount: Object.keys(fields).length,
    seenLabels,
    customFinancialFields,
    sheetName: selected.sheetName,
  };
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
    .some((term) => matchesPreferredSheet(sheetText, term))
    ? 10000
    : 0;
  const orderPenalty = index * 20;

  return fieldScore + sipaScore + projectionScore + capitalScore + preferenceScore - brouillonPenalty - orderPenalty;
}

function matchesPreferredSheet(sheetText, term) {
  if (sheetText.includes(term) || term.includes(sheetText)) return true;

  const sheetTokens = sheetText.split(' ').filter((token) => token.length >= 2);
  const termTokens = term.split(' ').filter((token) => token.length >= 2);
  if (!sheetTokens.length || !termTokens.length) return false;

  const sheetSet = new Set(sheetTokens);
  const commonTokens = termTokens.filter((token) => sheetSet.has(token));
  const common = commonTokens.length;
  const hasNumberMatch = commonTokens.some((token) => /\d/.test(token));
  const hasTwoTextMatches = commonTokens.filter((token) => !/\d/.test(token)).length >= 2;

  return (hasNumberMatch && common >= 2) || hasTwoTextMatches;
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
    { key: 'income', label: 'Income', aliases: ['income'], type: 'amount' },
    { key: 'costs', label: 'Costs', aliases: ['costs'], type: 'amount' },
    { key: 'interest_rate', label: 'Interest rate', aliases: ['interest rate'], type: 'percent' },
    { key: 'interest_paid', label: 'Interest paid', aliases: ['interest paid'], type: 'amount' },
    { key: 'ebt', label: 'EBT', aliases: ['ebt'], type: 'amount' },
    { key: 'tax', label: 'Tax', aliases: ['tax'], type: 'amount' },
    { key: 'dividend', label: 'Dividend', aliases: ['dividend'], type: 'amount' },
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
    { key: 'debt', label: 'Debt', aliases: ['debt'], type: 'amount' },
    { key: 'value', label: 'Value', aliases: ['value'], type: 'amount' },
    { key: 'cashflow', label: 'IRR cash-flow', aliases: ['irr'], type: 'amount' },
    { key: 'dividend_yield', label: 'Dividend Yield', aliases: ['dividend yield'], type: 'percent' },
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

      FIELD_DEFINITIONS.forEach((field) => {
        if (!matchesField(label, field.labels) || fields[field.key] != null) return;

        const value = findNearbyValue(rows, rowIndex, colIndex, field.kind);
        if (value == null) return;

        fields[field.key] = normalizeFieldValue(value, field.kind);
        seenLabels.push(String(cellValue));
      });

      PCT_LABELS.forEach((labels, pctKey) => {
        if (!matchesField(label, labels) || fields[pctKey] != null) return;

        const percent = findNearbyPercent(rows, rowIndex, colIndex, label);
        if (percent == null) return;

        fields[pctKey] = percent;
      });
    });
  });
}

function matchesField(label, candidates) {
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    return label === normalizedCandidate || label.includes(normalizedCandidate);
  });
}

function findNearbyValue(rows, rowIndex, colIndex, kind) {
  const candidates = [];

  for (let col = colIndex + 1; col <= colIndex + 6; col += 1) {
    candidates.push(rows[rowIndex]?.[col]);
  }

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
  if (fields.honoraires_sipa_pct == null && fields.prix_bien > 0 && fields.honoraires_sipa != null) {
    fields.honoraires_sipa_pct = round2((fields.honoraires_sipa / fields.prix_bien) * 100);
  }

  const prixTotal = Number(fields.prix_bien || 0) +
    Number(fields.versement_initial || 0) +
    Number(fields.amortissement_5_ans || 0) +
    Number(fields.honoraires_sipa || 0) +
    Number(fields.frais_dossier_bancaire || 0);

  if (fields.hypotheque_pct == null && prixTotal > 0 && fields.hypotheque != null) {
    fields.hypotheque_pct = round2((fields.hypotheque / prixTotal) * 100);
  }

  if (fields.interets_hypothecaires_pct == null && fields.hypotheque > 0 && fields.interets_hypothecaires != null) {
    fields.interets_hypothecaires_pct = round2((fields.interets_hypothecaires / fields.hypotheque) * 100);
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
