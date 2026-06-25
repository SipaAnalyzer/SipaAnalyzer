create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,
  actor_id uuid,
  actor_email text,
  actor_name text,
  target_type text,
  target_id text,
  target_label text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "Allow insert for authenticated users"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Allow select for authenticated users"
  on public.audit_logs for select
  using (auth.role() = 'authenticated');
