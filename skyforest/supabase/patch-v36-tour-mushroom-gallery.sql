-- PATCH v36: allow up to several photos of the tour's main mushroom.
-- mushroom_image_url stays the primary/cover image (first one); mushroom_images
-- holds the full gallery (up to 5) pulled from the species reference.

ALTER TABLE public.mushroom_tours
  ADD COLUMN IF NOT EXISTS mushroom_images text[];
