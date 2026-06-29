alter table public.analysis
  add column if not exists banque_a_type_taux text default 'fixe',
  add column if not exists banque_a_marge_saron numeric default 0.5,
  add column if not exists banque_b_type_taux text default 'fixe',
  add column if not exists banque_b_marge_saron numeric default 0.5;
