import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, EyeOff, Info, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALERT_STYLE = {
  critical: {
    icon: ShieldAlert,
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
    dot: 'bg-red-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    dot: 'bg-blue-400',
  },
};

export default function SmartAlertsPanel({
  alerts = [],
  selectedIds = [],
  onToggleSelect,
  onHideSelected,
}) {
  const hasSelection = selectedIds.length > 0;

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Alertes intelligentes</h2>
        </div>
        <div className="flex items-center gap-2">
          {onHideSelected && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              disabled={!hasSelection}
              onClick={onHideSelected}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Masquer
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-background/40 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium">Aucune alerte active</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aucun bien supprimé ni baisse de prix liée au SARON détecté.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts.map((alert) => {
            const cfg = ALERT_STYLE[alert.severity] || ALERT_STYLE.info;
            const Icon = cfg.icon;
            const checked = selectedIds.includes(alert.id);
            const content = (
              <div className={`h-full rounded-lg border p-4 transition hover:border-primary/40 ${cfg.className}`}>
                <div className="flex items-start gap-3">
                  {onToggleSelect && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect(alert.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      aria-label="Selectionner l'alerte"
                    />
                  )}
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-[11px] uppercase tracking-wide opacity-80">{alert.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-5">{alert.description}</p>
                  </div>
                </div>
              </div>
            );

            return alert.link ? (
              <Link key={alert.id} to={alert.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={alert.id}>{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
