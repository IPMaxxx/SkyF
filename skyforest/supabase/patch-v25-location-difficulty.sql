-- PATCH v25: Add difficulty and description fields to locations

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN IF NOT EXISTS description text;
