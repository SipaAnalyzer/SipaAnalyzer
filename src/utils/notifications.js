import { supabase } from '@/api/supabaseClient';

export async function fetchNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[Notifications] fetch error:', error);
    return [];
  }
  return data || [];
}

export async function fetchUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.warn('[Notifications] count error:', error);
    return 0;
  }
  return count || 0;
}

export async function markAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) console.warn('[Notifications] mark read error:', error);
}

export async function markAllAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .is('is_read', false);

  if (error) console.warn('[Notifications] mark all read error:', error);
}

export async function recordNotification({ userId, actorId, eventType, targetType, targetId, targetLabel, metadata = {} }) {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: userId,
    actor_id: actorId || user?.id || null,
    event_type: eventType,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
    metadata,
  };

  const { error } = await supabase.from('notifications').insert(payload);

  if (error) {
    console.warn('[Notifications] record error:', error);
  }
}

export async function notifyAllUsers({ actorId, eventType, targetType, targetId, targetLabel, metadata = {} }) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id');

  if (error) {
    console.warn('[Notifications] notifyAll users fetch error:', error);
    return;
  }

  const notifications = profiles.map((profile) => ({
    user_id: profile.id,
    actor_id: actorId,
    event_type: eventType,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
    metadata,
  }));

  const { error: insertError } = await supabase.from('notifications').insert(notifications);

  if (insertError) {
    console.warn('[Notifications] notifyAll insert error:', insertError);
  }
}
