alter table public.properties
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by_id uuid default null;

alter table public.analysis
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by_id uuid default null;

create index if not exists idx_properties_deleted_at on public.properties(deleted_at);
create index if not exists idx_analysis_deleted_at on public.analysis(deleted_at);
