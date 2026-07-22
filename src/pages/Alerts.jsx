import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Filter, Loader2 } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import SmartAlertsPanel from '../components/SmartAlertsPanel';
import { buildSmartAlerts } from '../utils/smartAlerts';
import { listAuditLogs } from '../utils/auditLogs';
import { filterHiddenAlerts, readHiddenAlertIds, writeHiddenAlertIds } from '../utils/alertVisibility';

const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'critical', label: 'Critiques' },
  { value: 'warning', label: 'Warnings' },
  { value: 'info', label: 'Informations' },
];

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [hiddenAlertIds, setHiddenAlertIds] = useState(readHiddenAlertIds);
  const [selectedAlertIds, setSelectedAlertIds] = useState([]);

  const { data: comments = [], isLoading: lc } = useQuery({
    queryKey: ['alerts-comments'],
    queryFn: () => base44.entities.Comment.list('-created_date', 1000),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['alerts-audit-logs'],
    queryFn: () => listAuditLogs(200),
  });

  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['alerts-properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['alerts-analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 1000),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const alerts = useMemo(() => buildSmartAlerts({
    auditLogs,
    comments,
    properties,
    analyses,
  }), [auditLogs, comments, properties, analyses]);

  const visibleAlerts = useMemo(() => filterHiddenAlerts(alerts, hiddenAlertIds), [alerts, hiddenAlertIds]);

  const filteredAlerts = severityFilter === 'all'
    ? visibleAlerts
    : visibleAlerts.filter((alert) => alert.severity === severityFilter);

  const toggleAlertSelection = (id) => {
    setSelectedAlertIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const hideSelectedAlerts = () => {
    setHiddenAlertIds((current) => {
      const merged = Array.from(new Set([...current, ...selectedAlertIds]));
      writeHiddenAlertIds(merged);
      return merged;
    });
    setSelectedAlertIds([]);
  };

  if (lc || lp || la) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Alertes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Surveillance des suppressions, baisses de prix et dossiers sans activite depuis 30 jours.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          <Filter className="ml-2 h-4 w-4 text-muted-foreground" />
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSeverityFilter(filter.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                severityFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <SmartAlertsPanel
        alerts={filteredAlerts}
        selectedIds={selectedAlertIds}
        onToggleSelect={toggleAlertSelection}
        onHideSelected={hideSelectedAlerts}
      />
    </div>
  );
}
