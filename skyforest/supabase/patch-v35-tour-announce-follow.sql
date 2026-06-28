-- PATCH v35: "announced" tours (no dates yet) + free follow/watch + admin notify.
--
-- Flow:
--  * Admin creates a tour with status 'announced' and no auction/tour dates yet.
--  * Any registered user can follow it for free to track its status.
--  * Once the admin fills in the auction date and publishes, an admin "Send
--    notifications" action emails every follower that the date has been set.
--  * followers_count is kept denormalized so we can show the total publicly
--    without exposing who follows.

-- 1. Allow the 'announced' status and make auction dates optional.
ALTER TABLE public.mushroom_tours DROP CONSTRAINT IF EXISTS mushroom_tours_status_check;
ALTER TABLE public.mushroom_tours
  ADD CONSTRAINT mushroom_tours_status_check
  CHECK (status IN ('draft', 'announced', 'published', 'finished', 'cancelled'));

ALTER TABLE public.mushroom_tours ALTER COLUMN auction_start_at DROP NOT NULL;
ALTER TABLE public.mushroom_tours ALTER COLUMN auction_end_at DROP NOT NULL;

ALTER TABLE public.mushroom_tours
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notifications_sent_at timestamptz;

-- 2. Followers (watchlist) — free, one row per user per tour.
CREATE TABLE IF NOT EXISTS public.tour_followers (
  tour_id uuid NOT NULL REFERENCES public.mushroom_tours(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  PRIMARY KEY (tour_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_followers_tour ON public.tour_followers (tour_id);

ALTER TABLE public.tour_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own follows" ON public.tour_followers;
CREATE POLICY "Users see their own follows"
  ON public.tour_followers FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users add their own follows" ON public.tour_followers;
CREATE POLICY "Users add their own follows"
  ON public.tour_followers FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users remove their own follows" ON public.tour_followers;
CREATE POLICY "Users remove their own follows"
  ON public.tour_followers FOR DELETE USING (user_id = auth.uid());

-- 3. Keep followers_count in sync via trigger.
CREATE OR REPLACE FUNCTION public.sync_tour_followers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.mushroom_tours
      SET followers_count = followers_count + 1
      WHERE id = NEW.tour_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mushroom_tours
      SET followers_count = greatest(followers_count - 1, 0)
      WHERE id = OLD.tour_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tour_followers_count ON public.tour_followers;
CREATE TRIGGER trg_tour_followers_count
  AFTER INSERT OR DELETE ON public.tour_followers
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_followers_count();

-- 4. Announced tours must be publicly visible (so users can find & follow them).
DROP POLICY IF EXISTS "Anyone can view active tours" ON public.mushroom_tours;
CREATE POLICY "Anyone can view active tours"
  ON public.mushroom_tours FOR SELECT
  USING (status IN ('announced', 'published', 'finished'));
