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
  ['prix total', null],
  ['revenu net', null],
  ['rendement brut', null],
  ['rendement net', null],
  ['revenu distribu', null],
  ['taxe', 'impot'],
  ['taux', null],
  ['note', null],
  ['score', null],
  ['etat', null],
  ['emplacement', null],
  ['statut', null],
];

function findField(label) {
  const cleaned = label.toLowerCase().trim().replace(/[^a-z0-9éèêëàâäùûüôöîïç\s]/g, '');
  for (const [keyword, field] of LABEL_TO_FIELD) {
    if (cleaned.includes(keyword)) return field;
  }
  return null;
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

        console.log('[ExcelImport] rows:', rows.length, rows.slice(0, 3));
        const result = {};
        let labelCol = -1, valCol = -1;

        for (const row of rows) {
          if (!row || row.length < 2) continue;
          const vals = row.map((c) => String(c ?? '').trim());
          if (labelCol === -1) {
            const labelLower = vals.map((v) => v.toLowerCase());
            if (labelLower.some((v) => /rubrique|désignation|libellé|libelle|poste/i.test(v))) {
              const li = labelLower.findIndex((v) => /rubrique|désignation|libellé|libelle|poste/i.test(v));
              const mi = labelLower.findIndex((v) => /montant|valeur|chf|prix|taux|evaluation|évaluation/i.test(v));
              if (li !== -1 && mi !== -1) { labelCol = li; valCol = mi; }
              continue;
            }
          }
          if (labelCol === -1) {
            labelCol = 0; valCol = vals.length - 1;
          }
          const label = vals[labelCol];
          const rawVal = vals[valCol];
          if (!label) continue;

          const field = findField(label);
          if (!field) continue;

          if (!rawVal) continue;
          const num = parseFloat(rawVal.replace(/['\u2019\s]/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
          if (!isNaN(num)) result[field] = num;
          else result[field] = rawVal;
        }

        console.log('[ExcelImport] extracted:', result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}
