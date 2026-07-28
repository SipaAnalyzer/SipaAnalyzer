alter table public.analysis
  add column if not exists prix_achat numeric,
  add column if not exists construction numeric default 0,
  add column if not exists honoraires_transaction_sipa_group numeric default 0,
  add column if not exists fonds_propres_achat numeric default 0;
