-- Allow the pending role used for newly registered users.
-- This fixes Supabase Auth "Database error saving new user" when a signup trigger
-- creates public.user_permissions with role = 'en_attente'.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.user_permissions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format(
      'alter table public.user_permissions drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.user_permissions
  alter column role set default 'en_attente';

alter table public.user_permissions
  add constraint user_permissions_role_check
  check (role in ('en_attente', 'membre', 'direction', 'admin'));

-- If a trigger inserts a row without explicit permissions, make sure the
-- default pending rows cannot see anything.
alter table public.user_permissions
  alter column is_admin set default false,
  alter column can_view_properties set default false,
  alter column can_create_property set default false,
  alter column can_edit_property set default false,
  alter column can_delete_property set default false,
  alter column can_create_analysis set default false,
  alter column can_edit_analysis set default false,
  alter column can_delete_analysis set default false,
  alter column can_view_comparator set default false,
  alter column can_view_presentation set default false,
  alter column can_comment set default false;

update public.user_permissions
set
  role = 'en_attente',
  is_admin = false,
  can_view_properties = false,
  can_create_property = false,
  can_edit_property = false,
  can_delete_property = false,
  can_create_analysis = false,
  can_edit_analysis = false,
  can_delete_analysis = false,
  can_view_comparator = false,
  can_view_presentation = false,
  can_comment = false
where role = 'membre'
  and coalesce(is_admin, false) = false
  and coalesce(can_create_property, false) = false
  and coalesce(can_edit_property, false) = false
  and coalesce(can_delete_property, false) = false
  and coalesce(can_create_analysis, false) = false
  and coalesce(can_edit_analysis, false) = false
  and coalesce(can_delete_analysis, false) = false
  and coalesce(can_comment, false) = false;
