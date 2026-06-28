-- PATCH v37: storage bucket for admin-uploaded tour photos.
-- Uploads are performed server-side with the service role (admin-gated in the
-- API route), so no per-user RLS policies are required. The bucket is public so
-- the photos can be shown on tour cards / public pages.

INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-photos', 'tour-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
