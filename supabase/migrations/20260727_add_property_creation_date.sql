alter table public.properties
  add column if not exists date_creation_bien date default current_date;

update public.properties
set date_creation_bien = coalesce(created_at::date, current_date)
where date_creation_bien is null;
