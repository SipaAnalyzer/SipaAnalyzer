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
      and role in ('super_admin', 'admin', 'direction')
  );
$$;

create or replace function public.role_level(role text)
returns integer
language sql
immutable
as $$
  select case role
    when 'super_admin' then 200
    when 'admin' then 100
    when 'direction' then 80
    when 'staff' then 60
    when 'membre' then 40
    when 'en_attente' then 20
    else 0
  end;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_permissions
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_admin_or_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_permissions
    where user_id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.can_manage_role(target_role text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_permissions
    where user_id = auth.uid()
      and role in ('admin', 'super_admin')
      and public.role_level(role) > public.role_level(target_role)
  );
$$;

alter table public.user_permissions enable row level security;

create policy "user_permissions_select_own_or_admin"
  on public.user_permissions for select
  using (
    user_id = auth.uid()
    or public.is_admin_or_super_admin()
  );

create policy "user_permissions_insert"
  on public.user_permissions for insert
  with check (
    auth.role() = 'authenticated'
    and (
      (user_id = auth.uid() and role not in ('admin', 'super_admin'))
      or
      public.can_manage_role(role)
    )
  );

create policy "user_permissions_update"
  on public.user_permissions for update
  using (public.can_manage_role(role))
  with check (public.can_manage_role(role));

create policy "user_permissions_delete"
  on public.user_permissions for delete
  using (
    public.can_manage_role(role)
    and user_id != auth.uid()
  );
