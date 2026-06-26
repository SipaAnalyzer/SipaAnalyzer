alter table public.analysis add column if not exists versement_initial numeric default 0;
alter table public.analysis add column if not exists amortissement_5_ans numeric default 0;
alter table public.analysis add column if not exists frais_dossier_bancaire numeric default 0;
