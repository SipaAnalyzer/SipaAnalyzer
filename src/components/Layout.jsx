import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Building2, GitCompareArrows, LogOut, Plus, Menu, Shield, Presentation, Star, Sun, Moon } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import logoSipa from '@/assets/logo-sipa.png';

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/properties', label: 'Biens immobiliers', icon: Building2 },
  { path: '/favorites', label: 'Favoris', icon: Star },
  { path: '/comparator', label: 'Comparateur', icon: GitCompareArrows },
  { path: '/presentation', label: 'Présentation', icon: Presentation },
];

function SidebarContent({ location, user, onNavigate }) {
  const { permissions, isAdmin } = usePermissions();
  const { theme, setTheme } = useTheme();

  const visibleNavItems = navItems.filter(item => {
    if (item.path === '/comparator') return isAdmin || permissions.can_view_comparator;
    if (item.path === '/presentation') return isAdmin || permissions.can_view_presentation;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-center">
          <img src={logoSipa} alt="SIPA" className="h-14 w-auto object-contain" />
        </div>
      </div>

      {(isAdmin || permissions.can_create_analysis) && (
        <div className="px-3 mb-4">
          <Link to="/new-analysis" onClick={onNavigate}>
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
              <Plus className="h-4 w-4" /> Nouvelle analyse
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-sidebar-accent text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/admin'
                ? 'bg-sidebar-accent text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            }`}
          >
            <Shield className="h-4 w-4" />
            Administration
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {user?.email || 'Utilisateur'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>

        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded transition-colors"
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
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col flex-shrink-0">
        <SidebarContent location={location} user={user} onNavigate={() => {}} />
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

          <img src={logoSipa} alt="SIPA" className="h-10 w-auto object-contain" />
        </header>

        <main className="flex-1 overflow-auto honeycomb-card">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
