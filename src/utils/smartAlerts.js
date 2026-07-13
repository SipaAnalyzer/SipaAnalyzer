import { normalizeAnalysis } from './calculations';

const LOW_GROSS_YIELD = 4;
const OPPORTUNITY_GROSS_YIELD = 4;
const HIGH_CHARGES_RATIO = 25;
const PENDING_ROLE_DAYS = 3;

export function buildSmartAlerts({
  properties = [],
  analyses = [],
  auditLogs = [],
  users = [],
  permissions = [],
} = {}) {
  const alerts = [];
  const latestByProperty = getLatestAnalysisByProperty(analyses);
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  properties.forEach((property) => {
    const latest = latestByProperty.get(property.id);
    if (!latest) return;
    const latestMarker = latest.id || latest.updated_at || latest.updated_date || latest.created_at || latest.created_date || 'current';

    if (Number(latest.rendement_brut || 0) > 0 && Number(latest.rendement_brut || 0) < LOW_GROSS_YIELD) {
      alerts.push({
        id: `low-yield-${property.id}-${latestMarker}`,
        severity: 'warning',
        category: 'Rentabilité',
        title: 'Rendement trop faible',
        description: `${property.nom_bien || 'Bien'} affiche un rendement brut de ${Number(latest.rendement_brut).toFixed(2)}%.`,
        link: `/property/${property.id}`,
      });
    }

    if (Number(latest.rendement_brut || 0) >= OPPORTUNITY_GROSS_YIELD) {
      alerts.push({
        id: `opportunity-detected-${property.id}-${latestMarker}`,
        severity: 'info',
        category: 'Opportunité',
        title: 'Opportunité détectée',
        description: `${property.nom_bien || 'Bien'} atteint un rendement brut de ${Number(latest.rendement_brut).toFixed(2)}%.`,
        link: `/property/${property.id}`,
      });
    }

    const chargesRatio = Number(latest.revenus_locatifs || 0) > 0
      ? (Number(latest.charges_operationnelles || 0) / Number(latest.revenus_locatifs || 0)) * 100
      : 0;

    if (chargesRatio >= HIGH_CHARGES_RATIO) {
      alerts.push({
        id: `high-charges-${property.id}-${latestMarker}`,
        severity: chargesRatio >= 35 ? 'critical' : 'warning',
        category: 'Charges',
        title: 'Charges trop élevées',
        description: `${property.nom_bien || 'Bien'} a des charges à ${chargesRatio.toFixed(1)}% des revenus locatifs.`,
        link: `/property/${property.id}`,
      });
    }
  });

  auditLogs.slice(0, 150).forEach((log) => {
    const label = log.target_label || log.target_id || 'élément concerné';
    const metadata = log.metadata || {};
    const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
    const hasMortgageRateChange = changes.some((change) => String(change.field || '').includes('taux_hypothecaire'));

    if (log.event_type === 'analysis_update' && hasMortgageRateChange) {
      alerts.push({
        id: `mortgage-rate-change-${log.id || log.created_at}`,
        severity: 'warning',
        category: 'Financement',
        title: 'Taux hypothécaire changé',
        description: `Un taux hypothécaire a changé sur ${label}.`,
      });
    }

    if (log.event_type === 'analysis_soft_deleted') {
      const property = propertyById.get(metadata.property_id);
      const propertyName = metadata.property_name || property?.nom_bien || label;
      alerts.push({
        id: `analysis-deleted-${log.id || log.created_at}`,
        severity: 'critical',
        category: 'Suppression',
        title: 'Analyse supprimée',
        description: `Une analyse concernant ${propertyName} a ete placee en corbeille.`,
        link: metadata.property_id ? `/property/${metadata.property_id}` : undefined,
      });
    }

    if (log.event_type === 'property_soft_deleted') {
      const propertyName = metadata.property_name || label;
      alerts.push({
        id: `property-deleted-${log.id || log.created_at}`,
        severity: 'critical',
        category: 'Suppression',
        title: 'Bien supprime',
        description: `${propertyName} a ete place en corbeille.`,
      });
    }
  });

  const permissionsByUser = new Map(permissions.map((permission) => [permission.user_id, permission]));
  users.forEach((user) => {
    const permission = permissionsByUser.get(user.id);
    const normalizedRole = String(permission?.role || '').trim().toLowerCase();
    const isPending = !permission || ['en_attente', 'pending', 'aucun', 'none', 'null', ''].includes(normalizedRole);
    const daysPending = daysSince(user.created_at || user.created_date);

    if (isPending && daysPending >= PENDING_ROLE_DAYS) {
      alerts.push({
        id: `pending-user-${user.id}`,
        severity: daysPending >= 7 ? 'critical' : 'warning',
        category: 'Accès',
        title: 'Utilisateur sans rôle',
        description: `${user.email || user.full_name || 'Utilisateur'} est en attente depuis ${daysPending} jour${daysPending > 1 ? 's' : ''}.`,
        link: '/admin',
      });
    }
  });

  return dedupeAlerts(alerts.filter((alert) => !String(alert.id || '').startsWith('price-change-')))
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 12);
}

function getLatestAnalysisByProperty(analyses) {
  const latest = new Map();

  analyses.forEach((analysis) => {
    const normalized = normalizeAnalysis(analysis);
    const current = latest.get(normalized.property_id);
    const currentDate = new Date(current?.created_at || current?.created_date || 0);
    const nextDate = new Date(normalized.created_at || normalized.created_date || 0);

    if (!current || nextDate > currentDate) {
      latest.set(normalized.property_id, normalized);
    }
  });

  return latest;
}

function daysSince(date) {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
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
