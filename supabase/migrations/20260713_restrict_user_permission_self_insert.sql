-- Prevent authenticated users from self-assigning a non-admin role by calling
-- the Supabase API directly. User permission rows must be created by an admin.

drop policy if exists "user_permissions_insert" on public.user_permissions;

create policy "user_permissions_insert_admin_only"
  on public.user_permissions for insert
  with check (
    auth.role() = 'authenticated'
    and public.can_manage_role(role)
    and user_id != auth.uid()
  );

drop policy if exists "user_permissions_update" on public.user_permissions;

create policy "user_permissions_update_admin_only"
  on public.user_permissions for update
  using (
    public.can_manage_role(role)
    and user_id != auth.uid()
  )
  with check (
    public.can_manage_role(role)
    and user_id != auth.uid()
  );
