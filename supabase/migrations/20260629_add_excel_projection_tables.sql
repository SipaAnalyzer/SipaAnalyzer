alter table public.analysis
  add column if not exists operating_projection jsonb default null,
  add column if not exists capital_projection jsonb default null;
