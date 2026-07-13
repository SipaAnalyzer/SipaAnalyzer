export const HIDDEN_ALERTS_KEY = 'sipa_hidden_alert_ids';

export function readHiddenAlertIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(HIDDEN_ALERTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeHiddenAlertIds(ids) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HIDDEN_ALERTS_KEY, JSON.stringify(ids.slice(0, 500)));
}

export function filterHiddenAlerts(alerts, hiddenIds) {
  const hidden = new Set(hiddenIds);
  return alerts.filter((alert) => !hidden.has(alert.id));
}
