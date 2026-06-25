import { useState, useEffect, useRef } from 'react';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from '@/utils/notifications';
import { useAuth } from '@/lib/AuthContext';
import moment from 'moment';

const EVENT_LABELS = {
  property_created: 'Bien ajouté',
  property_deleted: 'Bien supprimé',
  yield_target_reached: 'Rendement cible atteint',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setUnread(await fetchUnreadCount(user.id));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      setNotifications(await fetchNotifications(user.id, 30));
      setLoading(false);
    };
    load();
  }, [open, user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded transition-colors relative"
      >
        <Bell className="h-3.5 w-3.5" />
        Notifications
        {unread > 0 && (
          <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[320px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Tout lu
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{EVENT_LABELS[n.event_type] || n.event_type}</p>
                      {n.target_label && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.target_label}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {moment(n.created_at).fromNow()}
                      </p>
                    </div>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
