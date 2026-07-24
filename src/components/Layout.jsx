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
  <svg width="52" height="56" viewBox="0 0 155 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#logoSipaClip)">
      <path d="M76.0269 41.9624H76.2543V43.9367C75.979 43.9133 75.7875 43.9017 75.7037 43.9017C75.0334 43.9017 74.5068 44.1119 74.1238 44.5325C73.7527 44.9414 73.5612 45.4788 73.5612 46.133V49.7895H71.7539V42.0675H73.5612V43.2358H73.5732C74.2076 42.383 75.0215 41.9624 76.0269 41.9624Z" fill="#B8B7B6"/>
      <path d="M81.2097 49.9535C79.9769 49.9535 78.9834 49.5797 78.2174 48.8203C77.4514 48.0727 77.0684 47.1147 77.0684 45.9582C77.0684 44.8016 77.4514 43.8554 78.2174 43.096C78.9834 42.3367 79.9769 41.9512 81.2097 41.9512C82.4305 41.9512 83.412 42.325 84.178 43.061C84.956 43.797 85.339 44.7666 85.339 45.9582C85.339 47.1381 84.956 48.096 84.178 48.832C83.412 49.5797 82.4305 49.9535 81.2097 49.9535ZM81.2097 48.3297C81.856 48.3297 82.3946 48.1077 82.8375 47.6638C83.2803 47.2199 83.4958 46.6474 83.4958 45.9582C83.4958 45.2456 83.2803 44.6731 82.8375 44.2292C82.4066 43.7853 81.868 43.5633 81.2097 43.5633C80.5274 43.5633 79.9768 43.7853 79.546 44.2526C79.127 44.7082 78.9116 45.2806 78.9116 45.9699C78.9116 46.6358 79.127 47.1965 79.5579 47.6521C79.9888 48.1077 80.5394 48.3297 81.2097 48.3297Z" fill="#B8B7B6"/>
      <path d="M95.8723 42.1143H97.7156L94.9986 49.7895H93.3349L91.8507 44.9647H91.8387L90.3546 49.7895H88.7268L86.0098 42.1143H87.853L89.5526 47.161H89.5885L91.1086 42.1143H92.6287L94.1607 47.1727H94.1966L95.8723 42.1143Z" fill="#B8B7B6"/>
      <path d="M104.611 38.2012H106.394V49.825H104.671V48.797H104.635C104.036 49.568 103.186 49.9535 102.097 49.9535C100.996 49.9535 100.086 49.5914 99.3682 48.8671C98.6501 48.1428 98.291 47.1848 98.291 46.0049C98.291 44.8484 98.6501 43.8904 99.3682 43.1428C100.098 42.3834 101.008 42.0096 102.085 42.0096C103.139 42.0096 103.964 42.3601 104.575 43.0493H104.611V38.2012ZM100.745 47.6988C101.176 48.1311 101.714 48.3414 102.372 48.3414C103.031 48.3414 103.569 48.1311 104.012 47.6988C104.455 47.2666 104.671 46.7058 104.671 46.0283C104.671 45.339 104.455 44.7549 104.024 44.311C103.593 43.8437 103.043 43.6217 102.384 43.6217C101.738 43.6217 101.2 43.8437 100.757 44.2876C100.326 44.7315 100.11 45.3157 100.11 46.04C100.122 46.7058 100.326 47.2666 100.745 47.6988Z" fill="#B8B7B6"/>
      <path d="M127.543 41.9624C128.429 41.9624 129.111 42.2428 129.578 42.8035C130.068 43.3643 130.308 44.2054 130.308 45.3386V49.8012H128.488V45.7825C128.488 44.3105 127.974 43.5629 126.956 43.5629C126.43 43.5629 125.987 43.7848 125.628 44.2171C125.281 44.6376 125.113 45.2217 125.113 45.9577V49.8012H123.294V45.7825C123.294 44.3105 122.767 43.5629 121.726 43.5629C121.163 43.5629 120.708 43.7848 120.349 44.2171C120.002 44.6376 119.835 45.2217 119.835 45.9577V49.8012H118.027V42.0792H119.835V43.154H119.847C120.505 42.3596 121.331 41.9624 122.3 41.9624C123.413 41.9624 124.203 42.3946 124.67 43.2474H124.706C125.388 42.383 126.334 41.9624 127.543 41.9624Z" fill="#B8B7B6"/>
      <path d="M142.037 41.9624C142.923 41.9624 143.605 42.2428 144.072 42.8035C144.562 43.3643 144.802 44.2054 144.802 45.3386V49.8012H142.982V45.7825C142.982 44.3105 142.468 43.5629 141.45 43.5629C140.924 43.5629 140.481 43.7848 140.122 44.2171C139.775 44.6376 139.607 45.2217 139.607 45.9577V49.8012H137.788V45.7825C137.788 44.3105 137.261 43.5629 136.22 43.5629C135.657 43.5629 135.203 43.7848 134.843 44.2171C134.496 44.6376 134.329 45.2217 134.329 45.9577V49.8012H132.521V42.0792H134.329V43.154H134.341C134.999 42.3596 135.813 41.9624 136.806 41.9624C137.92 41.9624 138.71 42.3946 139.176 43.2474H139.212C139.882 42.383 140.828 41.9624 142.037 41.9624Z" fill="#B8B7B6"/>
      <path d="M150.739 49.9535C149.506 49.9535 148.513 49.5797 147.747 48.8203C146.981 48.0727 146.598 47.1147 146.598 45.9582C146.598 44.8016 146.981 43.8554 147.747 43.096C148.513 42.3367 149.506 41.9512 150.739 41.9512C151.96 41.9512 152.953 42.325 153.707 43.061C154.485 43.797 154.868 44.7666 154.868 45.9582C154.868 47.1381 154.485 48.096 153.707 48.832C152.953 49.5797 151.96 49.9535 150.739 49.9535ZM150.739 48.3297C151.385 48.3297 151.924 48.1077 152.367 47.6638C152.81 47.2199 153.025 46.6474 153.025 45.9582C153.025 45.2456 152.81 44.6731 152.367 44.2292C151.936 43.7853 151.397 43.5633 150.739 43.5633C150.057 43.5633 149.506 43.7853 149.075 44.2526C148.656 44.7082 148.441 45.2806 148.441 45.9699C148.441 46.6358 148.656 47.1965 149.087 47.6521C149.53 48.1077 150.081 48.3297 150.739 48.3297Z" fill="#B8B7B6"/>
      <path d="M66.8944 49.8363C65.7574 49.8363 64.8118 49.4858 64.0338 48.7966C63.2678 48.1073 62.8848 47.1494 62.8848 45.9344C62.8848 44.7895 63.2438 43.8433 63.95 43.0956C64.6682 42.348 65.6496 41.9741 66.9064 41.9741C67.4809 41.9741 68.0434 42.1026 68.594 42.348C69.1446 42.5933 69.6353 42.9671 70.0543 43.4578L68.9052 44.4157C68.3307 43.7615 67.6724 43.4344 66.9064 43.4344C66.2122 43.4344 65.6377 43.668 65.1828 44.1237C64.74 44.5793 64.5126 45.1867 64.5126 45.9461C64.5126 46.6587 64.74 47.2545 65.1828 47.7101C65.6257 48.1774 66.2002 48.3994 66.9064 48.3994C67.6963 48.3994 68.3666 48.0723 68.9052 47.418L70.0543 48.3877C69.2284 49.3573 68.1871 49.8363 66.8944 49.8363Z" fill="#B8B7B6"/>
      <path d="M114.293 49.7665V42.0679H115.861V49.7665H114.293Z" fill="#B8B7B6"/>
      <path d="M115.071 41.1333C115.554 41.1333 115.945 40.7515 115.945 40.2805C115.945 39.8095 115.554 39.4277 115.071 39.4277C114.588 39.4277 114.197 39.8095 114.197 40.2805C114.197 40.7515 114.588 41.1333 115.071 41.1333Z" fill="#B8B7B6"/>
      <path d="M62.8984 26.0983L67.1116 21.0749C69.4336 23.5632 72.2343 24.6263 74.3409 24.6263C76.7587 24.6263 77.788 23.4464 77.788 22.0913C77.788 20.4441 76.7108 19.7198 73.2637 18.5866C68.6197 17.0212 63.9637 14.8716 63.9637 8.96041C63.9637 3.97209 68.3085 0.222091 73.9938 0.128633C78.0035 0.0468577 81.654 1.56555 84.5865 4.00714L80.5529 9.15901C77.9197 7.1263 76.0286 6.3319 74.305 6.3319C72.5336 6.3319 71.4683 7.21976 71.4683 8.65667C71.4204 10.0936 72.5455 10.8529 75.861 12.1146C81.2471 14.1473 85.3764 15.4908 85.3764 21.2735C85.3764 28.3296 79.2243 30.8646 74.1374 30.8646C70.2116 30.8646 66.166 29.381 62.8984 26.0983Z" fill="#A8D544"/>
      <path d="M89.5527 0.502441H96.9137V30.4908H89.5527V0.502441Z" fill="#A8D544"/>
      <path d="M102.637 0.502441H114.259C121.787 0.502441 125.151 4.84824 125.151 10.8529C125.151 17.5235 120.626 20.8179 113.696 20.8179H109.651V30.4908H102.637V0.502441ZM112.882 14.6496C116.066 14.6496 117.706 13.166 117.706 10.6777C117.706 8.39964 116.246 6.70571 113.014 6.70571H109.651V14.6496H112.882Z" fill="#A8D544"/>
      <path d="M136.856 0.502441H143.75L154.941 30.4908H147.449L145.641 25.0819H134.965L133.157 30.4908H125.629L136.856 0.502441ZM143.75 19.1707L140.351 9.03048H140.267L136.916 19.1707H143.75Z" fill="#A8D544"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M30.916 0V3.23598H46.0809C46.5237 3.23598 46.9427 3.41121 47.2539 3.71495C47.5651 4.01869 47.7446 4.43925 47.7446 4.85981V19.743H51.0481V4.62617C51.0481 2.09112 48.9295 0.0116822 46.3442 0.0116822H30.916V0Z" fill="#A8D544"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M51.0361 30.2568H47.7326V45.1283C47.7326 45.5606 47.5531 45.9695 47.2419 46.2732C46.9307 46.5769 46.5118 46.7522 46.0689 46.7522H30.916V49.9998H46.3203C48.9056 49.9998 51.0241 47.9204 51.0241 45.3853V30.2568H51.0361Z" fill="#A8D544"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.0605469 19.743H3.36402V4.85981C3.36402 4.64953 3.4119 4.43925 3.49568 4.24065C3.57947 4.04206 3.69916 3.86682 3.85476 3.71495C4.01035 3.56308 4.18989 3.44626 4.39337 3.36449C4.59684 3.28271 4.81228 3.23598 5.02773 3.23598H20.1806V0H4.77638C2.17908 0 0.0605469 2.07944 0.0605469 4.61449V19.743Z" fill="#A8D544"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M20.1806 49.9998V46.7638H5.01576C4.5729 46.7638 4.15398 46.5886 3.84279 46.2849C3.53159 45.9811 3.35205 45.5606 3.35205 45.14V30.2568H0.0605469V45.3737C0.0605469 47.9087 2.17908 49.9881 4.76441 49.9881H20.1806V49.9998Z" fill="#A8D544"/>
    </g>
    <defs>
      <clipPath id="logoSipaClip">
        <rect width="155" height="50" fill="none"/>
      </clipPath>
    </defs>
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
