import JSZip from 'jszip';

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

export async function extractAnalysisFieldsFromExcel(file) {
  const zip = await JSZip.loadAsync(file);
  const sharedStrings = await readSharedStrings(zip);
  const worksheetPaths = Object.keys(zip.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const fields = {};
  const seenLabels = [];

  for (const path of worksheetPaths) {
    const xml = await readText(zip, path);
    const rows = parseWorksheet(xml, sharedStrings);
    extractRows(rows, fields, seenLabels);
  }

  applyDerivedPercentages(fields);

  return {
    fields,
    importedCount: Object.keys(fields).length,
    seenLabels,
  };
}

async function readText(zip, path) {
  const file = zip.file(path);
  return file ? file.async('text') : '';
}

async function readSharedStrings(zip) {
  const xml = await readText(zip, 'xl/sharedStrings.xml');
  if (!xml) return [];

  const doc = parseXml(xml);
  return Array.from(doc.getElementsByTagName('si')).map((si) =>
    Array.from(si.getElementsByTagName('t')).map((node) => node.textContent || '').join('')
  );
}

function parseWorksheet(xml, sharedStrings) {
  const doc = parseXml(xml);
  const rows = [];

  Array.from(doc.getElementsByTagName('c')).forEach((cell) => {
    const ref = cell.getAttribute('r');
    if (!ref) return;

    const { row, col } = decodeCellRef(ref);
    const value = readCellValue(cell, sharedStrings);
    if (value === null || value === '') return;

    if (!rows[row]) rows[row] = [];
    rows[row][col] = value;
  });

  return rows;
}

function parseXml(xml) {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute('t');
  const valueNode = cell.getElementsByTagName('v')[0];

  if (type === 'inlineStr') {
    return Array.from(cell.getElementsByTagName('t')).map((node) => node.textContent || '').join('');
  }

  if (!valueNode) return null;

  const raw = valueNode.textContent || '';
  if (type === 's') return sharedStrings[Number(raw)] ?? '';
  if (type === 'b') return raw === '1';
  return raw;
}

function decodeCellRef(ref) {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref);
  const letters = match?.[1].toUpperCase() || 'A';
  const row = Number(match?.[2] || 1) - 1;
  let col = 0;

  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }

  return { row, col: col - 1 };
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
    return label.includes(normalizedCandidate) || normalizedCandidate.includes(label);
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
