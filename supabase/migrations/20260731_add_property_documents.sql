-- Ajoute la colonne `documents` (jsonb) sur properties pour stocker plusieurs pièces jointes
-- Format : [ { "name": "brochure.pdf", "url": "https://..." }, ... ]
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;
