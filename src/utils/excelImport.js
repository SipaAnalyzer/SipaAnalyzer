import * as XLSX from 'xlsx';

const LABEL_TO_FIELD = [
  ['prix du bien', 'prix_bien'],
  ['versement initial', 'versement_initial'],
  ['amortissement', 'amortissement_5_ans'],
  ['honoraires transaction', 'honoraires_sipa'],
  ['honoraires sipa', 'honoraires_sipa'],
  ['frais de dossier', 'frais_dossier_bancaire'],
  ['fonds propres', 'fonds_propres'],
  ['hypothèque', 'hypotheque'],
  ['hypotheque', 'hypotheque'],
  ['revenus locatifs', 'revenus_locatifs'],
  ['charges opérationnelles', 'charges_operationnelles'],
  ['intérêt hypothécaire', 'interets_hypothecaires'],
  ['intérêt hypothecaire', 'interets_hypothecaires'],
  ['honoraires de gestion', 'gestion'],
  ['impôt', 'impot'],
  ['impot', 'impot'],
  ['banque a taux', 'banque_a_taux_hypothecaire'],
  ['banque a amortissement', 'banque_a_amortissement_annuel'],
  ['banque a évaluation', 'banque_a_evaluation'],
  ['banque a evaluation', 'banque_a_evaluation'],
  ['banque b taux', 'banque_b_taux_hypothecaire'],
  ['banque b amortissement', 'banque_b_amortissement_annuel'],
  ['banque b évaluation', 'banque_b_evaluation'],
  ['banque b evaluation', 'banque_b_evaluation'],
];

function findField(label) {
  const cleaned = label.toLowerCase().trim().replace(/[^a-z0-9éèêëàâäùûüôöîïç\s]/g, '');
  for (const [keyword, field] of LABEL_TO_FIELD) {
    if (cleaned.includes(keyword)) return field;
  }
  return null;
}

function isNumeric(v) {
  if (v == null || v === '') return false;
  const s = String(v).replace(/['\u2019\s]/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return !isNaN(n) && isFinite(n);
}

function parseNum(v) {
  const s = String(v).replace(/['\u2019\s]/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  return parseFloat(s);
}

export function parseAnalysisExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log('[ExcelImport] rows:', rows.length, rows.slice(0, 5));

        // Phase 1: find rows with known labels and find which column has the value
        const colVotes = {};
        const labelRows = [];

        for (const row of rows) {
          if (!row || row.length < 2) continue;
          const label = String(row[0] ?? '').trim();
          if (!label) continue;
          const field = findField(label);
          if (!field) continue;
          labelRows.push(row);

          // For this row, find columns that have numeric values
          for (let ci = 1; ci < row.length && ci < 15; ci++) {
            if (isNumeric(row[ci])) {
              colVotes[ci] = (colVotes[ci] || 0) + 1;
            }
          }
        }

        // Find which column has the most matches across known-label rows
        let valCol = -1;
        let maxVotes = 0;
        for (const [ci, count] of Object.entries(colVotes)) {
          if (count > maxVotes) {
            maxVotes = count;
            valCol = parseInt(ci);
          }
        }

        if (valCol === -1) {
          console.log('[ExcelImport] no value column detected');
          resolve({});
          return;
        }

        // Phase 2: extract using the detected column
        const result = {};
        for (const row of labelRows) {
          const label = String(row[0] ?? '').trim();
          const field = findField(label);
          if (!field) continue;

          const raw = row[valCol];
          if (!isNumeric(raw)) continue;
          result[field] = parseNum(raw);
        }

        console.log('[ExcelImport] valCol:', valCol, 'votes:', colVotes, 'extracted:', result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}
