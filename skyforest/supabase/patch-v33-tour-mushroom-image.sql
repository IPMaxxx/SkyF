-- PATCH v33: pick the tour's main mushroom from the species reference (iNaturalist)
-- and store its image so it can be shown large on the tours list / public page.
--
-- mushroom_species (existing text column) keeps the display name
-- (common name, or latin name as fallback). The two columns below add the
-- picture and a stable reference id from the species catalog.

ALTER TABLE public.mushroom_tours
  ADD COLUMN IF NOT EXISTS mushroom_image_url text,
  ADD COLUMN IF NOT EXISTS mushroom_inaturalist_id integer;
