import { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Building2, GitCompareArrows, LogOut, Plus, Menu, Shield, Presentation, Star, Sun, Moon, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import QuickNotes from '@/components/QuickNotes';
import AIAssistant from '@/components/AIAssistant';
import { buildSmartAlerts, getAutoTrashCandidates } from '@/utils/smartAlerts';
import { listAuditLogs, recordAuditLog } from '@/utils/auditLogs';
import { filterHiddenAlerts, readHiddenAlertIds } from '@/utils/alertVisibility';

const SEEN_ALERTS_KEY = 'sipa_seen_alert_ids';
const SIDEBAR_COLLAPSED_KEY = 'sipa_sidebar_collapsed';
const AUTO_TRASH_PROCESSING_IDS = new Set();
const NAV_ALERT_QUERY_OPTIONS = {
  staleTime: 0,
  refetchInterval: 30000,
  refetchOnWindowFocus: true,
};

function readSeenAlertIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_ALERTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeSeenAlertIds(ids) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(ids.slice(0, 250)));
}

function readSidebarCollapsed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

function writeSidebarCollapsed(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
}

const LogoSipaCrochet = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 280" width="52" height="56">
    <g stroke="#A5D63A" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M40 113V50H103" />
      <path d="M157 50H220V113" />
      <path d="M40 167V230H103" />
      <path d="M157 230H220V167" />
    </g>
  </svg>
);

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/properties', label: 'Biens immobiliers', icon: Building2 },
  { path: '/favorites', label: 'Favoris', icon: Star },
  { path: '/comparator', label: 'Comparateur', icon: GitCompareArrows },
  { path: '/presentation', label: 'Présentation', icon: Presentation },
];

function SidebarContent({ location, user, onNavigate, collapsed = false, onToggleCollapse }) {
  const { permissions, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [seenAlertIds, setSeenAlertIds] = useState(readSeenAlertIds);
  const [hiddenAlertIds, setHiddenAlertIds] = useState(readHiddenAlertIds);

  const { data: alertComments = [] } = useQuery({
    queryKey: ['nav-alert-comments'],
    queryFn: () => base44.entities.Comment.list('-created_date', 1000),
    ...NAV_ALERT_QUERY_OPTIONS,
  });

  const { data: alertAuditLogs = [] } = useQuery({
    queryKey: ['nav-alert-audit-logs'],
    queryFn: () => listAuditLogs(200),
    ...NAV_ALERT_QUERY_OPTIONS,
  });

  const { data: alertProperties = [] } = useQuery({
    queryKey: ['nav-alert-properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    ...NAV_ALERT_QUERY_OPTIONS,
  });

  const { data: alertAnalyses = [] } = useQuery({
    queryKey: ['nav-alert-analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 1000),
    ...NAV_ALERT_QUERY_OPTIONS,
  });

  const alerts = useMemo(() => buildSmartAlerts({
    auditLogs: alertAuditLogs,
    comments: alertComments,
    properties: alertProperties,
    analyses: alertAnalyses,
  }), [alertAuditLogs, alertComments, alertProperties, alertAnalyses]);

  const autoTrashCandidates = useMemo(() => getAutoTrashCandidates({
    auditLogs: alertAuditLogs,
    comments: alertComments,
    properties: alertProperties,
    analyses: alertAnalyses,
  }), [alertAuditLogs, alertComments, alertProperties, alertAnalyses]);

  const visibleAlerts = useMemo(() => filterHiddenAlerts(alerts, hiddenAlertIds), [alerts, hiddenAlertIds]);
  const alertIds = useMemo(() => visibleAlerts.map((alert) => alert.id).filter(Boolean), [visibleAlerts]);
  const unseenAlertCount = useMemo(() => {
    const seen = new Set(seenAlertIds);
    return alertIds.filter((id) => !seen.has(id)).length;
  }, [alertIds, seenAlertIds]);

  const markAlertsSeen = () => {
    setSeenAlertIds((current) => {
      const merged = Array.from(new Set([...alertIds, ...current]));
      writeSeenAlertIds(merged);
      return merged;
    });
  };

  useEffect(() => {
    if (location.pathname === '/alerts') {
      setHiddenAlertIds(readHiddenAlertIds());
      markAlertsSeen();
    }
  }, [location.pathname, alertIds.join('|')]);

  useEffect(() => {
    const canAutoTrash = isAdmin || permissions.can_delete_property;
    if (!canAutoTrash || autoTrashCandidates.length === 0) return;

    autoTrashCandidates.forEach(({ property, daysSinceActivity }) => {
      if (!property?.id || AUTO_TRASH_PROCESSING_IDS.has(property.id)) return;
      AUTO_TRASH_PROCESSING_IDS.add(property.id);

      base44.entities.Property.delete(property.id)
        .then(() => recordAuditLog({
          eventType: 'property_auto_trashed',
          severity: 'warning',
          targetType: 'property',
          targetId: property.id,
          targetLabel: property.nom_bien || undefined,
          metadata: {
            property_id: property.id,
            property_name: property.nom_bien,
            status: property.statut,
            days_since_activity: daysSinceActivity,
            reason: 'Aucune activite depuis 90 jours',
          },
        }))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          queryClient.invalidateQueries({ queryKey: ['nav-alert-properties'] });
          queryClient.invalidateQueries({ queryKey: ['nav-alert-audit-logs'] });
          queryClient.invalidateQueries({ queryKey: ['trash-properties'] });
        })
        .catch((error) => {
          AUTO_TRASH_PROCESSING_IDS.delete(property.id);
          console.warn('[AutoTrash] property soft delete failed:', error);
        });
    });
  }, [autoTrashCandidates, isAdmin, permissions.can_delete_property, queryClient]);

  const visibleNavItems = navItems.filter(item => {
    if (item.path === '/comparator') return isAdmin || permissions.can_view_comparator;
    if (item.path === '/presentation') return isAdmin || permissions.can_view_presentation;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className={`p-4 pb-3 ${collapsed ? 'px-2' : 'px-6'}`}>
        <div className="flex items-center justify-center">
          <LogoSipaCrochet />
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-3 hidden h-8 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex"
            title={collapsed ? 'Afficher le menu' : 'Reduire le menu'}
            aria-label={collapsed ? 'Afficher le menu' : 'Reduire le menu'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {(isAdmin || permissions.can_create_analysis) && (
        <div className="px-3 mb-4">
          <Link to="/new-analysis" onClick={onNavigate}>
            <Button
              className={`w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground ${collapsed ? 'px-0' : ''}`}
              size="sm"
              title="Nouvelle analyse"
            >
              <Plus className="h-4 w-4 shrink-0" /> {!collapsed && 'Nouvelle analyse'}
            </Button>
          </Link>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1">
        {visibleNavItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-sidebar-accent text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        ))}

        <Link
          to="/alerts"
          onClick={() => {
            markAlertsSeen();
            onNavigate?.();
          }}
          title={collapsed ? 'Alertes' : undefined}
          className={`relative flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-200 ${
            location.pathname === '/alerts'
              ? 'bg-sidebar-accent text-primary font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="flex-1">Alertes</span>}
          {unseenAlertCount > 0 && (
            <span className={`${collapsed ? 'absolute right-1 top-1' : 'ml-auto'} inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white`}>
              {unseenAlertCount > 9 ? '9+' : unseenAlertCount}
            </span>
          )}
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            title={collapsed ? 'Administration' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/admin'
                ? 'bg-sidebar-accent text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && 'Administration'}
          </Link>
        )}
      </nav>

      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-sidebar-border space-y-2`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-3`}>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          {!collapsed && <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {user?.email || 'Utilisateur'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>}
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`flex items-center ${collapsed ? 'justify-center px-0 text-[0px] [&>svg]:h-3.5 [&>svg]:w-3.5' : 'gap-2 px-2 text-xs'} text-muted-foreground hover:text-foreground w-full py-1.5 rounded transition-colors`}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {!collapsed && (theme === 'dark' ? 'Mode clair' : 'Mode sombre')}
        </button>

        <button
          onClick={() => base44.auth.logout()}
          className={`flex items-center ${collapsed ? 'justify-center px-0 text-[0px] [&>svg]:h-3.5 [&>svg]:w-3.5' : 'gap-2 px-2 text-xs'} text-muted-foreground hover:text-foreground w-full py-1.5 rounded transition-colors`}
          title="Deconnexion"
        >
          <LogOut className="h-3.5 w-3.5" /> Déconnexion
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const { isLoading, hasAssignedRole } = usePermissions();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAssignedRole) {
    return <UserNotRegisteredError />;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden relative z-10">
      <aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-16' : 'w-64'} border-r border-border bg-sidebar flex-col flex-shrink-0 transition-[width] duration-300`}>
        <SidebarContent
          location={location}
          user={user}
          onNavigate={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-sidebar">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent location={location} user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <LogoSipaCrochet />
        </header>

        <main className="flex-1 overflow-auto honeycomb-card">
          <Outlet />
        </main>
      </div>

      <QuickNotes />
      <AIAssistant />
    </div>
  );
}
