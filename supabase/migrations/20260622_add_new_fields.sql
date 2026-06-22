-- Add missing columns for new features
-- Run this in your Supabase SQL Editor

alter table public.properties
  add column if not exists lien_piece_jointe text;

alter table public.analysis
  add column if not exists etat_batiment text,
  add column if not exists emplacement_bien text;
