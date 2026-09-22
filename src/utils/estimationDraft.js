// Per-user, per-tab drafts: retain the estimation and analysis through back/reload.
// Memory fallback keeps navigation working when sessionStorage is unavailable.
const memoryDrafts = new Map();

const draftKey = (userId, id) => `sipa_estimation_v1:${userId}:${id}`;

export function readEstimationDraft(userId, id = 'current') {
  if (!userId) return null;
  const key = draftKey(userId, id);
  if (memoryDrafts.has(key)) return memoryDrafts.get(key);
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function writeEstimationDraft(userId, draft, id = 'current') {
  if (!userId) return;
  const key = draftKey(userId, id);
  memoryDrafts.set(key, draft);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // The in-memory copy remains available during this visit.
  }
}
