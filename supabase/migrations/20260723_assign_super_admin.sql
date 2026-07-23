-- Assigner le rôle super_admin à magalie.loureiro@sipa.swiss
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'magalie.loureiro@sipa.swiss';

  if v_user_id is not null then
    insert into public.user_permissions (user_id, role, is_admin, can_view_properties, can_create_property, can_edit_property, can_delete_property, can_create_analysis, can_edit_analysis, can_delete_analysis, can_view_comparator, can_view_presentation, can_comment)
    values (v_user_id, 'super_admin', true, true, true, true, true, true, true, true, true, true, true)
    on conflict (user_id) do update set
      role = 'super_admin',
      is_admin = true,
      can_view_properties = true,
      can_create_property = true,
      can_edit_property = true,
      can_delete_property = true,
      can_create_analysis = true,
      can_edit_analysis = true,
      can_delete_analysis = true,
      can_view_comparator = true,
      can_view_presentation = true,
      can_comment = true;
  end if;
end;
$$;
