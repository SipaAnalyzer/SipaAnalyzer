import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { toast } from 'sonner';
import { Activity, Database, FileDown, Loader2, LogIn, LogOut, RefreshCw, RotateCcw, Search, Server, Trash2 } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listAuditLogs } from '@/utils/auditLogs';
import { fetchSaronRate } from '@/utils/saronRate';

const LOG_LABELS = {
  login: { label: 'Connexion', icon: LogIn, className: 'text-emerald-400 bg-emerald-500/10' },
  logout: { label: 'Déconnexion', icon: LogOut, className: 'text-muted-foreground bg-secondary' },
  export_pdf: { label: 'Export PDF', icon: FileDown, className: 'text-amber-400 bg-amber-500/10' },
};

export default function AdminSupervisionPanel() {
  return (
    <div id="section-supervision" className="space-y-6">
      <MonitoringPanel />
      <FilteredLogsPanel />
      <TrashPanel />
    </div>
  );
}

function MonitoringPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-monitoring'],
    queryFn: async () => {
      const [userResult, propertyResult, analysisResult, auditResult, saronRate] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('analysis').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
        fetchSaronRate(),
      ]);

      return {
        users: readCount(userResult),
        properties: readCount(propertyResult),
        analyses: readCount(analysisResult),
        auditLogs: readCount(auditResult),
        saronRate,
        auditOk: !auditResult.error,
        supabaseOk: !propertyResult.error && !analysisResult.error,
        checkedAt: new Date().toISOString(),
      };
    },
  });

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Monitoring technique</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Rafraîchir
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MonitorCard label="Supabase" value={data?.supabaseOk ? 'OK' : 'Erreur'} good={data?.supabaseOk} />
          <MonitorCard label="Logs audit" value={data?.auditOk ? `${data.auditLogs}` : 'Erreur'} good={data?.auditOk} />
          <MonitorCard label="SARON" value={data?.saronRate == null ? '-' : `${Number(data.saronRate).toFixed(3)}%`} good={data?.saronRate != null} />
          <MonitorCard label="Données" value={`${data?.properties || 0} biens / ${data?.analyses || 0} analyses`} good />
        </div>
      )}
    </section>
  );
}

function FilteredLogsPanel() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-filtered-logs'],
    queryFn: () => listAuditLogs(300),
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const eventTypes = useMemo(() => [...new Set(logs.map((log) => log.event_type).filter(Boolean))].sort(), [logs]);
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (typeFilter !== 'all' && log.event_type !== typeFilter) return false;
      if (!query) return true;
      return [log.event_type, log.actor_name, log.actor_email, log.target_label, log.target_type, log.metadata?.filename]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [logs, search, typeFilter]);

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Logs filtrables</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Rafraîchir
        </Button>
      </div>

      <div className="px-5 py-3 border-b border-border grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="text-xs bg-background border border-border rounded-lg px-2 py-2 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Tous les types</option>
          {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{LOG_LABELS[eventType]?.label || eventType}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher utilisateur, cible, fichier..." className="pl-9 bg-background border-border" />
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Aucun log ne correspond aux filtres.</div>
      ) : (
        <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
          {filteredLogs.map((log) => <LogRow key={log.id || `${log.event_type}-${log.created_at}`} log={log} />)}
        </div>
      )}
    </section>
  );
}

function TrashPanel() {
  const queryClient = useQueryClient();
  const { data: deletedProperties = [], isLoading: lp } = useQuery({
    queryKey: ['trash-properties'],
    queryFn: () => base44.entities.Property.listDeleted(100),
  });
  const { data: deletedAnalyses = [], isLoading: la } = useQuery({
    queryKey: ['trash-analysis'],
    queryFn: () => base44.entities.Analysis.listDeleted(100),
  });

  const restore = useMutation({
    mutationFn: ({ type, id }) => type === 'property' ? base44.entities.Property.restore(id) : base44.entities.Analysis.restore(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Élément restauré');
    },
    onError: (error) => toast.error(error?.message || 'Restauration impossible'),
  });

  const items = [
    ...deletedProperties.map((item) => ({ ...item, trashType: 'property', label: item.nom_bien || 'Bien sans nom' })),
    ...deletedAnalyses.map((item) => ({ ...item, trashType: 'analysis', label: `Analyse #${item.id?.slice(0, 8)}` })),
  ].sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Corbeille et restauration</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} élément{items.length > 1 ? 's' : ''}</span>
      </div>

      {lp || la ? (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">La corbeille est vide.</div>
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((item) => (
            <div key={`${item.trashType}-${item.id}`} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.trashType === 'property' ? 'Bien' : 'Analyse'} supprimé le {moment(item.deleted_at).format('DD MMM YYYY, HH:mm')}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-2" disabled={restore.isPending} onClick={() => restore.mutate({ type: item.trashType, id: item.id })}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurer
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LogRow({ log }) {
  const cfg = LOG_LABELS[log.event_type] || { label: log.event_type || 'Événement', icon: Activity, className: 'text-primary bg-primary/10' };
  const Icon = cfg.icon;

  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.className}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{cfg.label}</p>
          <span className="text-xs text-muted-foreground">{moment(log.created_at).format('DD MMM YYYY, HH:mm')}</span>
          {log.storage === 'local' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">local</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{log.actor_name || log.actor_email || 'Utilisateur inconnu'}{log.target_label ? ` - ${log.target_label}` : ''}</p>
        {log.metadata?.filename && <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate">{log.metadata.filename}</p>}
      </div>
    </div>
  );
}

function MonitorCard({ label, value, good }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Database className={`h-3.5 w-3.5 ${good ? 'text-emerald-400' : 'text-red-400'}`} />
      </div>
      <p className={`mt-2 text-sm font-semibold ${good ? 'text-foreground' : 'text-red-400'}`}>{value}</p>
    </div>
  );
}

function readCount(result) {
  if (result.error) return 0;
  return result.count || 0;
}
