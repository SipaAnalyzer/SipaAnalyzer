import jsPDF from 'jspdf';
import { formatCHF, formatPercent } from './calculations';
import { recordAuditLog } from './auditLogs';

const PAGE = {
  margin: 16,
  width: 210,
  height: 297,
};

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  en_cours: "En cours d'analyse",
  demande_complementaire: 'Demande complementaire',
  visite_sipa: 'Visite SIPA',
  demande_rapport_expertise_externe: 'Demande rapport expertise externe',
  proposition_achat: "Proposition d'achat",
  negociation: 'Negociation',
  proposition_acceptee: 'Proposition acceptee',
  commercialise: 'Commercialise',
  valide: 'Valide',
  abandonne: 'Abandonne',
};

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u202f/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function fileSafe(value) {
  return cleanText(value || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function drawHoneycombBackground(doc) {
  try {
    const r = 35;
    const spacingX = r * Math.sqrt(3);
    const spacingY = r * 1.5;
    const cols = Math.ceil(PAGE.width / spacingX) + 1;
    const rows = Math.ceil(PAGE.height / spacingY) + 1;

    doc.setDrawColor(232, 241, 214);
    doc.setLineWidth(0.08);

    for (let row = 0; row < rows; row++) {
      const offsetX = row % 2 === 0 ? 0 : spacingX / 2;
      for (let col = 0; col < cols; col++) {
        const cx = col * spacingX + offsetX;
        const cy = row * spacingY + r;
        let px = null, py = null;
        for (let i = 0; i <= 6; i++) {
          const angle = (Math.PI / 3) * (i % 6) - Math.PI / 6;
          const nx = cx + r * Math.cos(angle);
          const ny = cy + r * Math.sin(angle);
          if (px != null) doc.line(px, py, nx, ny);
          px = nx; py = ny;
        }
      }
    }
  } catch (e) {
    console.warn('Honeycomb background skipped:', e);
  }
}

function drawSipaBrackets(doc) {
  const size = 16;
  const x = PAGE.width - PAGE.margin - size;
  const y = 4;
  const scale = size / 180;
  const sx = (value) => x + (value - 40) * scale;
  const sy = (value) => y + (value - 50) * scale;

  doc.setDrawColor(165, 214, 58);
  doc.setLineWidth(1.35);
  if (doc.setLineCap) doc.setLineCap('round');

  doc.line(sx(40), sy(113), sx(40), sy(50));
  doc.line(sx(40), sy(50), sx(103), sy(50));
  doc.line(sx(157), sy(50), sx(220), sy(50));
  doc.line(sx(220), sy(50), sx(220), sy(113));
  doc.line(sx(40), sy(167), sx(40), sy(230));
  doc.line(sx(40), sy(230), sx(103), sy(230));
  doc.line(sx(157), sy(230), sx(220), sy(230));
  doc.line(sx(220), sy(230), sx(220), sy(167));

  doc.setLineWidth(0.2);
  if (doc.setLineCap) doc.setLineCap('butt');
}

function createDoc(title, subtitle) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setProperties({
    title: cleanText(title),
    subject: 'SIPA Analyzer',
    creator: 'SIPA Analyzer',
  });

  drawHoneycombBackground(doc);

  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, PAGE.width, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(cleanText(title), PAGE.margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(cleanText(subtitle), PAGE.margin, 22);
  drawSipaBrackets(doc);

  doc.setTextColor(35, 35, 35);
  return { doc, y: 42 };
}

function ensureSpace(doc, state, needed = 20) {
  if (state.y + needed <= PAGE.height - PAGE.margin) return;
  doc.addPage();
  drawHoneycombBackground(doc);
  state.y = PAGE.margin;
}

function sectionTitle(doc, state, title) {
  ensureSpace(doc, state, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(cleanText(title), PAGE.margin, state.y);
  state.y += 6;
  doc.setDrawColor(225, 225, 225);
  doc.line(PAGE.margin, state.y, PAGE.width - PAGE.margin, state.y);
  state.y += 6;
}

function keyValueTable(doc, state, rows, options = {}) {
  const colWidth = (PAGE.width - PAGE.margin * 2) / (options.columns || 2);
  const labelWidth = 48;
  const rowHeight = 8;

  rows.forEach((row, index) => {
    const column = index % (options.columns || 2);
    if (column === 0) ensureSpace(doc, state, rowHeight + 2);

    const x = PAGE.margin + column * colWidth;
    const y = state.y;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(cleanText(row.label), x, y);

    doc.setFont('helvetica', row.highlight ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(row.highlight ? 12 : 30, row.highlight ? 126 : 30, row.highlight ? 97 : 30);
    doc.text(cleanText(row.value || 'N/A'), x + labelWidth, y);

    if (column === (options.columns || 2) - 1) state.y += rowHeight;
  });

  if (rows.length % (options.columns || 2) !== 0) state.y += rowHeight;
  state.y += 4;
}

function simpleTable(doc, state, headers, rows, widths) {
  const rowHeight = 8;
  ensureSpace(doc, state, rowHeight * 2);

  doc.setFillColor(245, 245, 245);
  doc.rect(PAGE.margin, state.y - 5, PAGE.width - PAGE.margin * 2, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  let x = PAGE.margin + 2;
  headers.forEach((header, index) => {
    doc.text(cleanText(header), x, state.y);
    x += widths[index];
  });
  state.y += rowHeight;

  rows.forEach((row) => {
    ensureSpace(doc, state, rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(35, 35, 35);

    x = PAGE.margin + 2;
    row.forEach((cell, index) => {
      const text = cleanText(cell);
      const maxWidth = widths[index] - 4;
      const split = doc.splitTextToSize(text, maxWidth).slice(0, 2);
      doc.text(split, x, state.y);
      x += widths[index];
    });

    doc.setDrawColor(235, 235, 235);
    doc.line(PAGE.margin, state.y + 3, PAGE.width - PAGE.margin, state.y + 3);
    state.y += rowHeight;
  });

  state.y += 4;
}

function drawComparisonChart(doc, state, properties = []) {
  const metrics = [
    { key: 'score_global', label: 'Score', formatter: (value) => `${Math.round(value || 0)}/100` },
    { key: 'rendement_brut', label: 'Rdt. brut', formatter: formatPercent },
    { key: 'rendement_net_fonds_propres', label: 'Rdt. net/FP', formatter: formatPercent },
  ];
  const colors = [
    [245, 158, 11],
    [16, 185, 129],
    [59, 130, 246],
    [139, 92, 246],
  ];
  const chartWidth = PAGE.width - PAGE.margin * 2;
  const labelWidth = 34;
  const barWidth = chartWidth - labelWidth - 8;
  const rowHeight = Math.max(12, properties.length * 5 + 9);

  ensureSpace(doc, state, metrics.length * rowHeight + 26);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(PAGE.margin, state.y - 5, chartWidth, metrics.length * rowHeight + 16, 2, 2, 'F');
  doc.setDrawColor(232, 232, 232);
  doc.roundedRect(PAGE.margin, state.y - 5, chartWidth, metrics.length * rowHeight + 16, 2, 2, 'S');

  properties.forEach((property, index) => {
    const x = PAGE.margin + 4 + (index % 2) * 72;
    const y = state.y - 1 + Math.floor(index / 2) * 5;
    doc.setFillColor(...colors[index % colors.length]);
    doc.circle(x, y - 1, 1.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);
    doc.text(cleanText(property.nom_bien || `Bien ${index + 1}`).slice(0, 26), x + 4, y);
  });

  state.y += Math.ceil(properties.length / 2) * 5 + 4;

  metrics.forEach((metric) => {
    const values = properties.map((property) => Number(property.analysis?.[metric.key] || 0));
    const max = Math.max(...values.map((value) => Math.abs(value)), 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(45, 45, 45);
    doc.text(metric.label, PAGE.margin + 4, state.y + 4);

    properties.forEach((property, index) => {
      const value = values[index];
      const normalized = Math.max(0, Math.abs(value) / max);
      const x = PAGE.margin + labelWidth;
      const y = state.y + index * 5;
      const width = normalized * barWidth;

      doc.setFillColor(...colors[index % colors.length]);
      doc.roundedRect(x, y, width, 3, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(65, 65, 65);
      doc.text(metric.formatter(value), x + Math.min(width + 2, barWidth - 18), y + 2.8);
    });

    state.y += rowHeight;
  });

  state.y += 6;
}

function finalizeDoc(doc, filename, auditLog) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`SIPA Analyzer - Page ${i}/${pageCount}`, PAGE.margin, PAGE.height - 8);
  }

  if (auditLog) {
    void recordAuditLog({
      eventType: 'export_pdf',
      ...auditLog,
      metadata: {
        ...(auditLog.metadata || {}),
        filename,
      },
    });
  }

  return doc;
}

function save(doc, filename, auditLog) {
  finalizeDoc(doc, filename, auditLog).save(filename);
}

function propertyRows(property) {
  return [
    { label: 'Nom', value: property?.nom_bien },
    { label: 'Statut', value: STATUS_LABELS[property?.statut] || property?.statut },
    { label: 'Adresse', value: property?.adresse },
    { label: 'Ville', value: property?.ville },
    { label: 'Canton', value: property?.canton },
    { label: 'Pays', value: property?.pays },
    { label: 'Annee', value: property?.annee_construction },
    { label: 'Surface', value: property?.surface ? `${property.surface} m2` : 'N/A' },
    { label: 'Logements', value: property?.nombre_logements },
    { label: "Courtier / apporteur d'affaire", value: property?.courtier_apporteur_affaire || 'N/A' },
    { label: 'Coordonnees', value: property?.latitude && property?.longitude ? `${property.latitude}, ${property.longitude}` : 'N/A' },
  ];
}

function analysisRows(analysis) {
  return [
    { label: 'Prix du bien', value: formatCHF(analysis?.prix_bien) },
    { label: 'Versement initial copropriete', value: formatCHF(analysis?.versement_initial) },
    { label: 'Amortissement sur 5 ans', value: formatCHF(analysis?.amortissement_5_ans) },
    { label: 'Honoraires Sipa Immobilier SA', value: formatCHF(analysis?.honoraires_sipa) },
    { label: 'Frais de dossier bancaire', value: formatCHF(analysis?.frais_dossier_bancaire) },
    { label: 'Prix total', value: formatCHF(analysis?.prix_total), highlight: true },
    { label: 'Fonds propres', value: formatCHF(analysis?.fonds_propres) },
    { label: 'Hypotheque', value: formatCHF(analysis?.hypotheque) },
    { label: 'Revenus locatifs annuels', value: formatCHF(analysis?.revenus_locatifs) },
    { label: 'Charges operationnelles', value: formatCHF(analysis?.charges_operationnelles) },
    { label: 'Interet hypothecaire', value: formatCHF(analysis?.interets_hypothecaires) },
    { label: 'Honoraires de gestion', value: formatCHF(analysis?.gestion) },
    { label: 'Revenu net', value: formatCHF(analysis?.revenu_net), highlight: true },
    { label: 'Impot', value: formatCHF(analysis?.impot) },
    { label: 'Revenu distribue', value: formatCHF(analysis?.revenu_distribue), highlight: true },
    { label: 'Rdt. brut', value: formatPercent(analysis?.rendement_brut) },
    { label: 'Rdt. net / FP', value: formatPercent(analysis?.rendement_net_fonds_propres), highlight: true },
    { label: 'Rdt. dist. / FP', value: formatPercent(analysis?.revenu_distribue_fonds_propres), highlight: true },
  ];
}

function bankRows(analysis) {
  return [
    ['Banque A', `${Number(analysis?.banque_a_taux_hypothecaire || 0).toFixed(2)} %`, formatCHF(analysis?.banque_a_amortissement_annuel), analysis?.banque_a_evaluation || 'N/A'],
    ['Banque B', `${Number(analysis?.banque_b_taux_hypothecaire || 0).toFixed(2)} %`, formatCHF(analysis?.banque_b_amortissement_annuel), analysis?.banque_b_evaluation || 'N/A'],
  ];
}

export function exportPropertyPdf(property, analyses = []) {
  const latest = analyses[0] || null;
  const { doc, y } = createDoc(
    `Fiche bien - ${property?.nom_bien || 'Bien'}`,
    `Genere le ${formatDate(new Date())}`
  );
  const state = { y };

  sectionTitle(doc, state, 'Informations du bien');
  keyValueTable(doc, state, propertyRows(property));

  if (property?.lien_annonce) {
    sectionTitle(doc, state, 'Lien annonce');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanText(property.lien_annonce), PAGE.margin, state.y);
    state.y += 12;
  }

  if (latest) {
    sectionTitle(doc, state, 'Derniere analyse');
    keyValueTable(doc, state, analysisRows(latest));
  }

  if (analyses.length > 0) {
    sectionTitle(doc, state, 'Historique des analyses');
    simpleTable(
      doc,
      state,
      ['Date', 'Statut', 'Score', 'Prix total', 'Rdt. net/FP'],
      analyses.map((analysis) => [
        formatDate(analysis.created_at || analysis.created_date),
        STATUS_LABELS[analysis.statut] || analysis.statut || 'N/A',
        `${Math.round(analysis.score_global || 0)}/100`,
        formatCHF(analysis.prix_total),
        formatPercent(analysis.rendement_net_fonds_propres),
      ]),
      [30, 30, 28, 45, 45]
    );
  }

  save(doc, `fiche-bien-${fileSafe(property?.nom_bien)}.pdf`, {
    targetType: 'property',
    targetId: property?.id,
    targetLabel: property?.nom_bien,
    metadata: { export_kind: 'fiche_bien' },
  });
}

export function exportAnalysisPdf(property, analysis, sections) {
  const opts = { property: true, financial: true, banks: true, ...(sections || {}) };
  const { doc, y } = createDoc(
    `Fiche analyse - ${property?.nom_bien || 'Bien'}`,
    `Analyse du ${formatDate(analysis?.created_at || analysis?.created_date || new Date())}`
  );
  const state = { y };

  if (opts.property) {
    sectionTitle(doc, state, 'Bien analyse');
    keyValueTable(doc, state, propertyRows(property));
  }

  if (opts.financial) {
    sectionTitle(doc, state, 'Synthese financiere');
    keyValueTable(doc, state, analysisRows(analysis));
  }

  if (opts.banks) {
    sectionTitle(doc, state, 'Scenarios bancaires');
    simpleTable(
      doc,
      state,
      ['Scenario', 'Taux', 'Amort. annuel', 'Evaluation'],
      bankRows(analysis),
      [28, 25, 38, 88]
    );
  }

  save(doc, `fiche-analyse-${fileSafe(property?.nom_bien)}.pdf`, {
    targetType: 'analysis',
    targetId: analysis?.id,
    targetLabel: property?.nom_bien,
    metadata: { export_kind: 'fiche_analyse', property_id: property?.id },
  });
}

export function exportComparisonPdf(properties = []) {
  const { doc, y } = createDoc(
    'Comparaison de biens',
    `Genere le ${formatDate(new Date())} - ${properties.length} biens compares`
  );
  const state = { y };

  sectionTitle(doc, state, 'Benchmark visuel');
  drawComparisonChart(doc, state, properties);

  sectionTitle(doc, state, 'Biens compares');
  simpleTable(
    doc,
    state,
    ['Bien', 'Ville', 'Score', 'Prix total', 'Rdt. net/FP'],
    properties.map((property) => [
      property.nom_bien,
      property.ville || 'N/A',
      property.analysis ? `${Math.round(property.analysis.score_global || 0)}/100 (${property.analysis.note || 'N/A'})` : 'N/A',
      property.analysis ? formatCHF(property.analysis.prix_total) : 'N/A',
      property.analysis ? formatPercent(property.analysis.rendement_net_fonds_propres) : 'N/A',
    ]),
    [52, 34, 28, 38, 28]
  );

  sectionTitle(doc, state, 'Indicateurs detailles');
  simpleTable(
    doc,
    state,
    ['Indicateur', ...properties.map((property) => property.nom_bien)],
    [
      ['Prix total', ...properties.map((p) => (p.analysis ? formatCHF(p.analysis.prix_total) : 'N/A'))],
      ['Fonds propres', ...properties.map((p) => (p.analysis ? formatCHF(p.analysis.fonds_propres) : 'N/A'))],
      ['Hypotheque', ...properties.map((p) => (p.analysis ? formatCHF(p.analysis.hypotheque) : 'N/A'))],
      ['Rendement brut', ...properties.map((p) => (p.analysis ? formatPercent(p.analysis.rendement_brut) : 'N/A'))],
      ['Rendement net/FP', ...properties.map((p) => (p.analysis ? formatPercent(p.analysis.rendement_net_fonds_propres) : 'N/A'))],
      ['Revenu net', ...properties.map((p) => (p.analysis ? formatCHF(p.analysis.revenu_net) : 'N/A'))],
      ['Revenu distribue', ...properties.map((p) => (p.analysis ? formatCHF(p.analysis.revenu_distribue) : 'N/A'))],
    ],
    [42, ...properties.map(() => (PAGE.width - PAGE.margin * 2 - 42) / Math.max(properties.length, 1))]
  );

  save(doc, `comparaison-${new Date().toISOString().slice(0, 10)}.pdf`, {
    targetType: 'comparison',
    targetLabel: `${properties.length} biens compares`,
    metadata: {
      export_kind: 'comparaison',
      property_ids: properties.map((property) => property.id),
    },
  });
}
