-- Force signup users to have no application role by default.
-- Run this in Supabase SQL Editor if new accounts still receive "membre".

-- 1) A common cause: user_permissions.role has DEFAULT 'membre'.
alter table if exists public.user_permissions
  alter column role drop default;

-- 2) Remove empty auto-created "membre" permission rows.
--    This does not remove admins/direction or users with write permissions.
delete from public.user_permissions
where role = 'membre'
  and coalesce(is_admin, false) = false
  and coalesce(can_create_property, false) = false
  and coalesce(can_edit_property, false) = false
  and coalesce(can_delete_property, false) = false
  and coalesce(can_create_analysis, false) = false
  and coalesce(can_edit_analysis, false) = false
  and coalesce(can_delete_analysis, false) = false
  and coalesce(can_comment, false) = false;

-- 3) Find triggers whose function body mentions user_permissions or membre,
--    then drop only those triggers. This catches custom trigger names.
do $$
declare
  trigger_record record;
begin
  for trigger_record in
    select
      event_object_schema,
      event_object_table,
      trigger_name
    from information_schema.triggers trigger_info
    join pg_trigger pg_trig
      on pg_trig.tgname = trigger_info.trigger_name
    join pg_proc proc
      on proc.oid = pg_trig.tgfoid
    join pg_namespace proc_ns
      on proc_ns.oid = proc.pronamespace
    where (
      pg_get_functiondef(proc.oid) ilike '%user_permissions%'
      or pg_get_functiondef(proc.oid) ilike '%membre%'
    )
    and event_object_schema in ('auth', 'public')
  loop
    execute format(
      'drop trigger if exists %I on %I.%I',
      trigger_record.trigger_name,
      trigger_record.event_object_schema,
      trigger_record.event_object_table
    );
  end loop;
end $$;

-- 4) Keep this diagnostic query available after execution.
--    It should return no trigger that writes user_permissions/membre.
select
  trigger_info.trigger_name,
  trigger_info.event_object_schema,
  trigger_info.event_object_table,
  proc_ns.nspname as function_schema,
  proc.proname as function_name
from information_schema.triggers trigger_info
join pg_trigger pg_trig
  on pg_trig.tgname = trigger_info.trigger_name
join pg_proc proc
  on proc.oid = pg_trig.tgfoid
join pg_namespace proc_ns
  on proc_ns.oid = proc.pronamespace
where (
  pg_get_functiondef(proc.oid) ilike '%user_permissions%'
  or pg_get_functiondef(proc.oid) ilike '%membre%'
)
and trigger_info.event_object_schema in ('auth', 'public');
