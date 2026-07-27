alter table public.analysis
  add column if not exists target_benefice_sipa_fonds_propres numeric default 0,
  add column if not exists target_benefice_sipa_fonds_propres_pct numeric default 15;
