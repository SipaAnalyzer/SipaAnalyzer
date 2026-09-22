import { buildAnalysisFromEstimation } from './quickEstimation.js';

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

export function resolveEstimationAnalysisDraft(userId, propertyId, navigationDraft) {
  if (!userId || !propertyId) return null;
  const stored = readEstimationDraft(userId, propertyId);
  const transferred = navigationDraft?.userId === userId ? navigationDraft : null;
  const matchesProperty = (draft) => draft?.property?.id === propertyId;
  const draft = matchesProperty(stored) ? stored : matchesProperty(transferred) ? transferred : null;
  const current = readEstimationDraft(userId);
  const matchingCurrent = current?.createdProperty?.id === propertyId ? current : null;
  const estimation = draft?.estimation
    || (matchesProperty(transferred) ? transferred.estimation : null)
    || (matchingCurrent ? { ...matchingCurrent.values, mode: matchingCurrent.mode } : null);
  const seed = estimation ? buildAnalysisFromEstimation(estimation, propertyId) : null;
  const initialData = draft?.initialData;
  const hasAmounts = initialData?.property_id === propertyId
    && ['prix_bien', 'revenus_locatifs', 'charges_operationnelles'].some((key) => Number(initialData[key]) > 0);

  if (!draft && !seed) return null;
  if (!hasAmounts && !seed && !draft?.analysisId) return null;
  return {
    ...draft,
    property: draft?.property || matchingCurrent.createdProperty,
    mode: draft?.mode || estimation?.mode,
    estimation,
    // Preserve edited amounts; recover a missing/empty initial payload from the original estimate.
    initialData: hasAmounts ? initialData : { ...initialData, ...seed, property_id: propertyId },
  };
}
