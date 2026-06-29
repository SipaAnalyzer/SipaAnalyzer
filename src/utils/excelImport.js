import * as XLSX from 'xlsx';

const LABEL_TO_FIELD = [
  ['prix du bien', 'prix_bien'],
  ['versement initial', 'versement_initial'],
  ['amortissement', 'amortissement_5_ans'],
  ['amortization', 'amortissement_5_ans'],
  ['honoraires transaction', 'honoraires_sipa'],
  ['honoraires sipa', 'honoraires_sipa'],
  ['frais de dossier', 'frais_dossier_bancaire'],
  ['fonds propres', 'fonds_propres'],
  ['hypotheque', 'hypotheque'],
  ['hypothèque', 'hypotheque'],
  ['revenus locatifs', 'revenus_locatifs'],
  ['charges operation', 'charges_operationnelles'],
  ['charges opération', 'charges_operationnelles'],
  ['intérêt hypothécaire', 'interets_hypothecaires'],
  ['intérêt hypothecaire', 'interets_hypothecaires'],
  ['interet hypothecaire', 'interets_hypothecaires'],
  ['honoraires de gestion', 'gestion'],
  ['impôt', 'impot'],
  ['impot', 'impot'],
  ['banque a taux', 'banque_a_taux_hypothecaire'],
  ['banque a amortissement', 'banque_a_amortissement_annuel'],
  ['banque a evaluation', 'banque_a_evaluation'],
  ['banque b taux', 'banque_b_taux_hypothecaire'],
  ['banque b amortissement', 'banque_b_amortissement_annuel'],
  ['banque b evaluation', 'banque_b_evaluation'],
];

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function findField(label) {
  const n = norm(label);
  for (const [keyword, field] of LABEL_TO_FIELD) {
    if (n.includes(norm(keyword))) return field;
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

        const colVotes = {};
        const labelRows = [];

        for (const row of rows) {
          if (!row || row.length < 2) continue;
          const label = String(row[0] ?? '').trim();
          if (!label) continue;
          const field = findField(label);
          if (!field) continue;
          labelRows.push({ row, label, field });

          for (let ci = 1; ci < row.length && ci < 15; ci++) {
            if (isNumeric(row[ci])) {
              colVotes[ci] = (colVotes[ci] || 0) + 1;
            }
          }
        }

        let valCol = -1;
        let maxVotes = 0;
        for (const [ci, count] of Object.entries(colVotes)) {
          if (count > maxVotes) {
            maxVotes = count;
            valCol = parseInt(ci);
          }
        }

        if (valCol === -1) {
          resolve({});
          return;
        }

        const result = {};
        for (const { label, field } of labelRows) {
          const raw = rows.find(r => String(r?.[0] ?? '').trim() === label)?.[valCol];
          if (!isNumeric(raw)) continue;
          result[field] = parseNum(raw);
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}
