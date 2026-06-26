create or replace function public.role_level(role text)
returns integer
language sql
immutable
as $$
  select case role
    when 'admin' then 100
    when 'direction' then 80
    when 'staff' then 60
    when 'membre' then 40
    when 'en_attente' then 20
    else 0
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_permissions
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.user_permissions enable row level security;

create policy "user_permissions_select_own_or_admin"
  on public.user_permissions for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

create policy "user_permissions_insert_own_or_admin"
  on public.user_permissions for insert
  with check (
    auth.role() = 'authenticated'
    and (
      (user_id = auth.uid() and role != 'admin')
      or
      (public.is_admin() and role != 'admin')
    )
  );

create policy "user_permissions_update_admin_only"
  on public.user_permissions for update
  using (
    public.is_admin()
    and role != 'admin'
  )
  with check (
    public.is_admin()
    and role != 'admin'
  );

create policy "user_permissions_delete_admin_only"
  on public.user_permissions for delete
  using (
    public.is_admin()
    and role != 'admin'
    and user_id != auth.uid()
  );
