import jsPDF from 'jspdf';
import { recordAuditLog } from './auditLogs';

function downloadText(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function flattenValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toCsv(rows = []) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const escape = (value) => `"${flattenValue(value).replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((header) => escape(row?.[header])).join(',')),
  ].join('\n');
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function exportBackupJson({ properties = [], analyses = [], auditLogs = [], users = [], permissions = [] }) {
  const filename = `sipa-backup-${stamp()}.json`;
  downloadText(filename, JSON.stringify({
    exported_at: new Date().toISOString(),
    properties,
    analyses,
    audit_logs: auditLogs,
    users,
    permissions,
  }, null, 2));

  void recordAuditLog({
    eventType: 'backup_export',
    severity: 'warning',
    targetType: 'admin',
    targetLabel: filename,
    metadata: { filename, format: 'json' },
  });
}

export function exportBackupCsvBundle({ properties = [], analyses = [], auditLogs = [] }) {
  const created = stamp();
  const files = [
    ['properties', properties],
    ['analysis', analyses],
    ['audit_logs', auditLogs],
  ];

  files.forEach(([name, rows]) => {
    downloadText(`sipa-${name}-${created}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  });

  void recordAuditLog({
    eventType: 'backup_export',
    severity: 'warning',
    targetType: 'admin',
    targetLabel: `CSV bundle ${created}`,
    metadata: { format: 'csv', files: files.map(([name]) => name) },
  });
}

export function exportSupervisionReport({ monitoring, logs = [], trashItems = [] }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const filename = `rapport-supervision-${stamp()}.pdf`;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Rapport de supervision SIPA Analyzer', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Genere le ${new Date().toLocaleString('fr-CH')}`, 14, y);
  y += 14;

  y = section(doc, y, 'Etat technique');
  y = kv(doc, y, 'Supabase', monitoring?.supabaseOk ? 'OK' : 'Erreur');
  y = kv(doc, y, 'Logs audit', monitoring?.auditOk ? `${monitoring.auditLogs || 0}` : 'Erreur');
  y = kv(doc, y, 'SARON', monitoring?.saronRate == null ? '-' : `${Number(monitoring.saronRate).toFixed(3)}%`);
  y = kv(doc, y, 'Donnees', `${monitoring?.properties || 0} biens / ${monitoring?.analyses || 0} analyses`);
  y += 6;

  y = section(doc, y, 'Synthese securite');
  const critical = logs.filter((log) => getSeverity(log) === 'critical').length;
  const warning = logs.filter((log) => getSeverity(log) === 'warning').length;
  y = kv(doc, y, 'Logs critiques', String(critical));
  y = kv(doc, y, 'Logs warning', String(warning));
  y = kv(doc, y, 'Elements en corbeille', String(trashItems.length));
  y += 6;

  y = section(doc, y, 'Derniers evenements');
  logs.slice(0, 12).forEach((log) => {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${new Date(log.created_at).toLocaleString('fr-CH')} - ${getSeverity(log).toUpperCase()} - ${log.event_type || 'event'} - ${log.actor_email || log.actor_name || 'N/A'}`, 14, y);
    y += 6;
  });

  doc.save(filename);

  void recordAuditLog({
    eventType: 'supervision_report_export',
    severity: 'info',
    targetType: 'admin',
    targetLabel: filename,
    metadata: { filename },
  });
}

function section(doc, y, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, 14, y);
  return y + 8;
}

function kv(doc, y, label, value) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(label, 14, y);
  doc.setFont('helvetica', 'bold');
  doc.text(value, 70, y);
  return y + 6;
}

function getSeverity(log) {
  return log.severity || log.metadata?.severity || 'info';
}
