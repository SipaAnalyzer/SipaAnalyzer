-- Ajoute la colonne `photos` (jsonb) sur properties pour stocker plusieurs photos du bien
-- Format : [ { "name": "photo1.jpg", "url": "https://..." }, ... ]
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;
