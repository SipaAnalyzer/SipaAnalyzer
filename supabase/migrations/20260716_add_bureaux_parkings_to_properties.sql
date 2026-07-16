alter table public.properties
  add column if not exists nombre_bureaux integer,
  add column if not exists nombre_parkings integer;
