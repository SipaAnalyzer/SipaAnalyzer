-- Ensure every new Supabase Auth user receives an explicit pending role.
-- The pending role has no permissions and remains blocked by the app until an admin changes it.

alter table if exists public.user_permissions
  alter column role set default 'en_attente';

alter table if exists public.user_permissions
  drop constraint if exists user_permissions_role_check;

alter table if exists public.user_permissions
  add constraint user_permissions_role_check
  check (role in ('en_attente', 'membre', 'staff', 'direction', 'admin', 'super_admin'));

create or replace function public.create_pending_permissions_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_permissions (
    user_id,
    role,
    is_admin,
    can_view_properties,
    can_create_property,
    can_edit_property,
    can_delete_property,
    can_create_analysis,
    can_edit_analysis,
    can_delete_analysis,
    can_view_comparator,
    can_view_presentation,
    can_comment
  )
  values (
    new.id,
    'en_attente',
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  )
  on conflict (user_id) do update
  set
    role = case
      when public.user_permissions.role is null or public.user_permissions.role = '' then 'en_attente'
      else public.user_permissions.role
    end,
    is_admin = coalesce(public.user_permissions.is_admin, false),
    can_view_properties = coalesce(public.user_permissions.can_view_properties, false),
    can_create_property = coalesce(public.user_permissions.can_create_property, false),
    can_edit_property = coalesce(public.user_permissions.can_edit_property, false),
    can_delete_property = coalesce(public.user_permissions.can_delete_property, false),
    can_create_analysis = coalesce(public.user_permissions.can_create_analysis, false),
    can_edit_analysis = coalesce(public.user_permissions.can_edit_analysis, false),
    can_delete_analysis = coalesce(public.user_permissions.can_delete_analysis, false),
    can_view_comparator = coalesce(public.user_permissions.can_view_comparator, false),
    can_view_presentation = coalesce(public.user_permissions.can_view_presentation, false),
    can_comment = coalesce(public.user_permissions.can_comment, false);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_pending_permissions on auth.users;

create trigger on_auth_user_created_pending_permissions
  after insert on auth.users
  for each row
  execute function public.create_pending_permissions_on_signup();

insert into public.user_permissions (
  user_id,
  role,
  is_admin,
  can_view_properties,
  can_create_property,
  can_edit_property,
  can_delete_property,
  can_create_analysis,
  can_edit_analysis,
  can_delete_analysis,
  can_view_comparator,
  can_view_presentation,
  can_comment
)
select
  users.id,
  'en_attente',
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false
from auth.users users
left join public.user_permissions permissions
  on permissions.user_id = users.id
where permissions.user_id is null;
