-- Durcissement production SIPA Analyzer
-- A executer dans Supabase SQL Editor apres verification sur environnement dev.

alter table public.audit_logs
  add column if not exists severity text default 'info';

create index if not exists idx_audit_logs_severity on public.audit_logs(severity);

alter table public.properties
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by_id uuid default null;

alter table public.analysis
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by_id uuid default null;

create index if not exists idx_properties_deleted_at on public.properties(deleted_at);
create index if not exists idx_analysis_deleted_at on public.analysis(deleted_at);

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_permissions
    where user_id = auth.uid()
      and (
        role in ('admin', 'super_admin')
        or is_admin = true
        or case permission_name
          when 'can_view_properties' then coalesce(can_view_properties, false)
          when 'can_create_property' then coalesce(can_create_property, false)
          when 'can_edit_property' then coalesce(can_edit_property, false)
          when 'can_delete_property' then coalesce(can_delete_property, false)
          when 'can_create_analysis' then coalesce(can_create_analysis, false)
          when 'can_edit_analysis' then coalesce(can_edit_analysis, false)
          when 'can_delete_analysis' then coalesce(can_delete_analysis, false)
          when 'can_comment' then coalesce(can_comment, false)
          else false
        end
      )
  );
$$;

alter table public.properties enable row level security;
alter table public.analysis enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "properties_select_all_authenticated" on public.properties;
drop policy if exists "properties_insert_own" on public.properties;
drop policy if exists "properties_update_own_or_admin" on public.properties;
drop policy if exists "properties_delete_own_or_admin" on public.properties;
create policy "properties_select_permitted" on public.properties for select using (public.has_permission('can_view_properties'));
create policy "properties_insert_permitted" on public.properties for insert with check (created_by_id = auth.uid() and public.has_permission('can_create_property'));
create policy "properties_update_permitted" on public.properties for update using (public.has_permission('can_edit_property')) with check (public.has_permission('can_edit_property'));
create policy "properties_delete_permitted" on public.properties for delete using (public.has_permission('can_delete_property'));

drop policy if exists "analysis_select_all_authenticated" on public.analysis;
drop policy if exists "analysis_insert_own" on public.analysis;
drop policy if exists "analysis_update_own_or_admin" on public.analysis;
drop policy if exists "analysis_delete_own_or_admin" on public.analysis;
create policy "analysis_select_permitted" on public.analysis for select using (public.has_permission('can_view_properties'));
create policy "analysis_insert_permitted" on public.analysis for insert with check (created_by_id = auth.uid() and public.has_permission('can_create_analysis'));
create policy "analysis_update_permitted" on public.analysis for update using (public.has_permission('can_edit_analysis')) with check (public.has_permission('can_edit_analysis'));
create policy "analysis_delete_permitted" on public.analysis for delete using (public.has_permission('can_delete_analysis'));

drop policy if exists "comments_select_all_authenticated" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own_or_admin" on public.comments;
drop policy if exists "comments_delete_own_or_admin" on public.comments;
create policy "comments_select_permitted" on public.comments for select using (public.has_permission('can_view_properties'));
create policy "comments_insert_permitted" on public.comments for insert with check (created_by_id = auth.uid() and public.has_permission('can_comment'));
create policy "comments_update_own_or_admin" on public.comments for update using (created_by_id = auth.uid() or public.has_permission('can_delete_property')) with check (created_by_id = auth.uid() or public.has_permission('can_delete_property'));
create policy "comments_delete_permitted" on public.comments for delete using (created_by_id = auth.uid() or public.has_permission('can_delete_property'));

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select using (created_by_id = auth.uid());
create policy "favorites_insert_own" on public.favorites for insert with check (created_by_id = auth.uid() and public.has_permission('can_view_properties'));
create policy "favorites_delete_own" on public.favorites for delete using (created_by_id = auth.uid());

drop policy if exists "Allow insert for authenticated users" on public.audit_logs;
drop policy if exists "Allow select for authenticated users" on public.audit_logs;
create policy "audit_logs_insert_authenticated" on public.audit_logs for insert with check (auth.role() = 'authenticated');
create policy "audit_logs_select_admin" on public.audit_logs for select using (public.is_admin_or_super_admin());
