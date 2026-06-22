import { supabase } from '@/api/supabaseClient';

const STORAGE_KEY = 'sipa_audit_logs_fallback';

function isMissingTable(error) {
  return /relation .* does not exist|Could not find the table|schema cache/i.test(error?.message || '');
}

function readFallbackLogs() {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (error) {
    console.warn('[AuditLogs] fallback read failed:', error);
    return [];
  }
}

function writeFallbackLog(log) {
  if (typeof window === 'undefined') return;

  const logs = readFallbackLogs();
  logs.unshift(log);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 250)));
}

export async function recordAuditLog({
  eventType,
  targetType = null,
  targetId = null,
  targetLabel = null,
  metadata = {},
}) {
  const { data } = await supabase.auth.getUser();
  const user = data.user || null;

  const payload = {
    event_type: eventType,
    actor_id: user?.id || null,
    actor_email: user?.email || null,
    actor_name: user?.user_metadata?.full_name || user?.email || 'Utilisateur inconnu',
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
    metadata,
    created_at: new Date().toISOString(),
  };

  const result = await supabase.from('audit_logs').insert(payload);

  if (!result.error) return payload;

  if (!isMissingTable(result.error)) {
    console.warn('[AuditLogs] insert failed:', result.error);
  }

  writeFallbackLog({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...payload,
    storage: 'local',
  });

  return payload;
}

export async function listAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return data || [];

  if (!isMissingTable(error)) {
    console.warn('[AuditLogs] list failed:', error);
  }

  return readFallbackLogs().slice(0, limit);
}
