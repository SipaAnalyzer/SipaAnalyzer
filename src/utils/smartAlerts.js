const PROPERTY_DELETE_EVENTS = new Set(['property_soft_deleted', 'property_hard_deleted']);

const PRICE_FIELDS = new Set([
  'prix_bien',
  'prix_total',
  'banque_a_evaluation',
  'banque_b_evaluation',
  'sales_price',
]);

const AUDIT_PREFIX = '__audit__';

export function buildSmartAlerts({ auditLogs = [], comments = [] } = {}) {
  const alerts = [];
  const seenDeletedProperties = new Set();
  const alertEvents = [
    ...auditLogs.map(normalizeAuditLog),
    ...parseAuditComments(comments),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  alertEvents.slice(0, 250).forEach((log) => {
    const metadata = log.metadata || {};

    if (PROPERTY_DELETE_EVENTS.has(log.event_type)) {
      const propertyId = metadata.property_id || log.target_id || log.id || log.created_at;
      if (seenDeletedProperties.has(propertyId)) return;
      seenDeletedProperties.add(propertyId);

      const propertyName = metadata.property_name || log.target_label || 'Bien';
      alerts.push({
        id: `property-deleted-${propertyId}`,
        severity: 'critical',
        category: 'Suppression',
        title: 'Bien supprimé',
        description: `${propertyName} a été supprimé ou placé en corbeille.`,
      });
      return;
    }

    const priceDrop = getPriceDropAlert(log);
    if (priceDrop) {
      alerts.push({
        id: `price-drop-${log.id || log.created_at}`,
        severity: 'warning',
        category: priceDrop.isSaronRelated ? 'SARON' : 'Prix',
        title: priceDrop.isSaronRelated ? 'Prix en baisse après actualisation SARON' : 'Prix en baisse',
        description: `${log.target_label || 'Un bien'} passe de ${formatCHF(priceDrop.before)} à ${formatCHF(priceDrop.after)} (${formatDelta(priceDrop.deltaPct)}).`,
        link: metadata.property_id ? `/property/${metadata.property_id}` : undefined,
      });
    }
  });

  return dedupeAlerts(alerts)
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 12);
}

function getPriceDropAlert(log) {
  if (log.event_type !== 'analysis_update') return null;

  const metadata = log.metadata || {};
  const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
  if (!changes.length) return null;

  const priceDrop = buildPriceDrop(changes);
  if (!priceDrop) return null;

  return {
    ...priceDrop,
    isSaronRelated: hasSaronSignal(log, changes),
  };
}

function normalizeAuditLog(log) {
  return {
    ...log,
    event_type: log.event_type || log.type,
  };
}

function parseAuditComments(comments = []) {
  return comments
    .map((comment) => {
      if (!comment?.commentaire?.startsWith(AUDIT_PREFIX)) return null;

      try {
        const audit = JSON.parse(comment.commentaire.slice(AUDIT_PREFIX.length));
        return {
          id: comment.id,
          event_type: audit.type,
          target_label: audit.target_label || audit.entity_id,
          target_id: audit.entity_id,
          metadata: {
            ...audit,
            property_id: comment.property_id,
          },
          created_at: comment.created_at || comment.created_date,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function buildPriceDrop(changes) {
  const priceDrop = changes
    .map((change) => ({
      ...change,
      beforeNumber: toNumber(change.before),
      afterNumber: toNumber(change.after),
    }))
    .find((change) =>
      PRICE_FIELDS.has(change.field) &&
      Number.isFinite(change.beforeNumber) &&
      Number.isFinite(change.afterNumber) &&
      change.afterNumber < change.beforeNumber
    );

  if (!priceDrop) return null;

  return {
    before: priceDrop.beforeNumber,
    after: priceDrop.afterNumber,
    deltaPct: priceDrop.beforeNumber > 0
      ? ((priceDrop.afterNumber / priceDrop.beforeNumber) - 1) * 100
      : null,
  };
}

function hasSaronSignal(log, changes) {
  const metadata = log.metadata || {};
  if (metadata.saron_context?.is_saron_related) return true;

  const metadataText = JSON.stringify(metadata).toLowerCase();

  return metadataText.includes('saron') ||
    changes.some((change) => {
      const field = String(change.field || '').toLowerCase();
      const before = String(change.before || '').toLowerCase();
      const after = String(change.after || '').toLowerCase();
      return field.includes('saron') || before.includes('saron') || after.includes('saron');
    });
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return NaN;
  return Number(String(value).replace(/[^0-9,.-]/g, '').replace(',', '.'));
}

function formatCHF(amount) {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDelta(deltaPct) {
  if (deltaPct == null) return 'baisse';
  return `${deltaPct.toFixed(2)}%`;
}

function severityWeight(severity) {
  return { critical: 3, warning: 2, info: 1 }[severity] || 0;
}

function dedupeAlerts(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
}
