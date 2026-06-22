-- Use an explicit pending role for new accounts.
-- "en_attente" has no permissions and is blocked by the frontend until an admin changes it.

alter table if exists public.user_permissions
  alter column role set default 'en_attente';

-- Convert empty default member rows to pending.
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

-- If a signup trigger explicitly inserts "membre", replace that literal in the function manually.
-- Use this diagnostic query to find it:
select
  proc_ns.nspname as function_schema,
  proc.proname as function_name,
  pg_get_functiondef(proc.oid) as function_definition
from pg_proc proc
join pg_namespace proc_ns
  on proc_ns.oid = proc.pronamespace
where pg_get_functiondef(proc.oid) ilike '%membre%'
   or pg_get_functiondef(proc.oid) ilike '%user_permissions%';
