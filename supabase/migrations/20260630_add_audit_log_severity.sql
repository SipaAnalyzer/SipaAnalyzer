alter table public.audit_logs
  add column if not exists severity text default 'info';

create index if not exists idx_audit_logs_severity on public.audit_logs(severity);
