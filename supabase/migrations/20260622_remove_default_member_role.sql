-- Remove automatic role assignment on signup.
-- New users must have no row in public.user_permissions until an admin creates one.

drop trigger if exists on_auth_user_created_create_permissions on auth.users;
drop trigger if exists on_auth_user_created_user_permissions on auth.users;
drop trigger if exists handle_new_user_permissions on auth.users;
drop trigger if exists create_user_permissions_on_signup on auth.users;

drop function if exists public.handle_new_user_permissions();
drop function if exists public.create_user_permissions_on_signup();

-- Optional cleanup: remove empty default "membre" rows created automatically.
-- This keeps any user with custom permissions or elevated role.
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
