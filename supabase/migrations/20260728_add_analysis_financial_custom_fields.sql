alter table public.analysis
  add column if not exists financial_custom_fields jsonb default '[]'::jsonb;
