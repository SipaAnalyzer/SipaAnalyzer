alter table public.properties
  add column if not exists created_by_id uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz;

alter table public.analysis
  add column if not exists created_by_id uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz;

alter table public.comments
  add column if not exists created_by_id uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz;

alter table public.favorites
  add column if not exists created_by_id uuid,
  add column if not exists created_at timestamptz default now();

create or replace function public.is_admin_or_direction()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.user_permissions
    where user_id = auth.uid()
      and role in ('admin', 'direction')
  );
$$;

alter table public.properties enable row level security;
create policy "properties_select_all_authenticated"
  on public.properties for select
  using (auth.role() = 'authenticated');
create policy "properties_insert_own"
  on public.properties for insert
  with check (auth.role() = 'authenticated' and created_by_id = auth.uid());
create policy "properties_update_own_or_admin"
  on public.properties for update
  using (created_by_id = auth.uid() or public.is_admin_or_direction());
create policy "properties_delete_own_or_admin"
  on public.properties for delete
  using (created_by_id = auth.uid() or public.is_admin_or_direction());

alter table public.analysis enable row level security;
create policy "analysis_select_all_authenticated"
  on public.analysis for select
  using (auth.role() = 'authenticated');
create policy "analysis_insert_own"
  on public.analysis for insert
  with check (auth.role() = 'authenticated' and created_by_id = auth.uid());
create policy "analysis_update_own_or_admin"
  on public.analysis for update
  using (created_by_id = auth.uid() or public.is_admin_or_direction());
create policy "analysis_delete_own_or_admin"
  on public.analysis for delete
  using (created_by_id = auth.uid() or public.is_admin_or_direction());

alter table public.comments enable row level security;
create policy "comments_select_all_authenticated"
  on public.comments for select
  using (auth.role() = 'authenticated');
create policy "comments_insert_own"
  on public.comments for insert
  with check (auth.role() = 'authenticated' and created_by_id = auth.uid());
create policy "comments_update_own_or_admin"
  on public.comments for update
  using (created_by_id = auth.uid() or public.is_admin_or_direction());
create policy "comments_delete_own_or_admin"
  on public.comments for delete
  using (created_by_id = auth.uid() or public.is_admin_or_direction());

alter table public.favorites enable row level security;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.role() = 'authenticated' and created_by_id = auth.uid());
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.role() = 'authenticated' and created_by_id = auth.uid());
create policy "favorites_delete_own"
  on public.favorites for delete
  using (created_by_id = auth.uid());
