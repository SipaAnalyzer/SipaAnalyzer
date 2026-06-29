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

function tryParseNum(v) {
  if (v == null || v === '') return NaN;
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

        // Phase 1: detect label column and value column
        // Look for a header row with "rubrique"/"montant" keywords
        let labelCol = 0;
        let valCol = -1;

        for (const row of rows) {
          if (!row) continue;
          const labels = row.map((c) => String(c ?? '').toLowerCase().trim());
          const hasLabelHeader = labels.some((v) => /^rubrique|^désignation|^libellé|^libelle|^poste/.test(v));
          const hasValHeader  = labels.some((v) => /^montant|^valeur|chf/.test(v));
          if (hasLabelHeader && hasValHeader) {
            labelCol = labels.findIndex((v) => /^rubrique|^désignation|^libellé|^libelle|^poste/.test(v));
            valCol  = labels.findIndex((v) => /^montant|^valeur|chf/.test(v));
            break;
          }
        }

        // If no header found, auto-detect: sum absolute numeric values per column
        if (valCol === -1) {
          const scores = {};
          let maxScore = 0;
          for (const row of rows) {
            if (!row) continue;
            for (let ci = 1; ci < row.length && ci < 20; ci++) {
              const n = tryParseNum(row[ci]);
              if (!isNaN(n) && Math.abs(n) > 1) {
                scores[ci] = (scores[ci] || 0) + Math.abs(n);
                if (scores[ci] > maxScore) {
                  maxScore = scores[ci];
                  valCol = ci;
                }
              }
            }
          }
        }

        if (valCol === -1) valCol = 1;

        // Phase 2: extract values
        const result = {};
        for (const row of rows) {
          if (!row) continue;
          const label = String(row[labelCol] ?? '').trim();
          if (!label) continue;
          const field = findField(label);
          if (!field) continue;

          const raw = row[valCol];
          const num = tryParseNum(raw);
          if (!isNaN(num)) result[field] = num;
        }

        console.log('[ExcelImport] labelCol:', labelCol, 'valCol:', valCol, 'extracted:', result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}
