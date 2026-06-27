-- PATCH v32: Mushroom Tours with auction (Format C — "race for spots")
--
-- Admin publishes a tour (title, date, departure point, mushroom species)
-- and auction parameters (spots, start price, bid step, start/end time).
-- When auction_start_at is reached the "Auction Hall" opens. Each bid is a
-- cash OFFER the player commits to pay on the tour; every bid action costs
-- 1 REAL token (no bonus — anti-spam). Winners = top-N offers (ranked), the
-- rest form a waitlist. Auto-promotion fills freed slots; winners must
-- confirm participation within confirm_window_hours.
--
-- Anonymity: the auction hall never exposes emails/names. Players only see
-- their own participant number; everyone else is anonymous. Full de-anonymized
-- data is available to admins only.


-- ============================================================
-- 1. profiles.contact_link — social / messenger contact
--    (Telegram / Instagram / WhatsApp), visible only to admins
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_link text;


-- ============================================================
-- 2. mushroom_tours — published tours + auction config
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mushroom_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  departure_lat double precision,
  departure_lng double precision,
  departure_desc text,
  mushroom_species text,
  tour_date date,
  departure_time time,
  spots integer NOT NULL DEFAULT 1 CHECK (spots > 0),
  auction_start_at timestamptz NOT NULL,
  auction_end_at timestamptz NOT NULL,
  start_price numeric NOT NULL DEFAULT 0 CHECK (start_price >= 0),
  bid_step numeric NOT NULL DEFAULT 1 CHECK (bid_step > 0),
  currency text NOT NULL DEFAULT 'BYN',
  anti_snipe_seconds integer NOT NULL DEFAULT 60 CHECK (anti_snipe_seconds >= 0),
  confirm_window_hours integer NOT NULL DEFAULT 24 CHECK (confirm_window_hours >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
  finished_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mushroom_tours_status
  ON public.mushroom_tours (status);
CREATE INDEX IF NOT EXISTS idx_mushroom_tours_auction_end
  ON public.mushroom_tours (auction_end_at);


-- ============================================================
-- 3. tour_bids — one row per bid action (1 token spent each)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tour_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.mushroom_tours(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_bids_tour ON public.tour_bids (tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_bids_tour_user ON public.tour_bids (tour_id, user_id);


-- ============================================================
-- 4. tour_participants — per-user aggregate + ranking/result
--    participant_no: sequential anonymous number within a tour
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tour_participants (
  tour_id uuid NOT NULL REFERENCES public.mushroom_tours(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_no integer NOT NULL,
  best_amount numeric NOT NULL DEFAULT 0,
  best_amount_at timestamptz,
  bids_count integer NOT NULL DEFAULT 0,
  tokens_spent integer NOT NULL DEFAULT 0,
  rank integer,
  status text NOT NULL DEFAULT 'bidding'
    CHECK (status IN ('bidding', 'winner', 'waitlist', 'confirmed', 'declined', 'no_show', 'expired')),
  confirm_deadline timestamptz,
  confirmed_at timestamptz,
  first_bid_at timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tour_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_participants_no
  ON public.tour_participants (tour_id, participant_no);


-- ============================================================
-- 5. RLS
--    tours: authenticated users see published/finished tours.
--    bids & participants: no client policies — only reachable via
--    SECURITY DEFINER RPCs (leaderboard is anonymized) or service role.
-- ============================================================

ALTER TABLE public.mushroom_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active tours" ON public.mushroom_tours;
CREATE POLICY "Anyone can view active tours"
  ON public.mushroom_tours FOR SELECT
  USING (status IN ('published', 'finished'));


-- ============================================================
-- 6. place_tour_bid — atomic: validate, spend 1 real token,
--    record bid, assign participant_no, anti-snipe extend
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_tour_bid(
  p_tour_id uuid,
  p_user_id uuid,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tour public.mushroom_tours;
  v_part public.tour_participants;
  v_is_new boolean;
  v_new_no integer;
  v_min_required numeric;
  v_spend jsonb;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Lock tour row
  SELECT * INTO v_tour FROM public.mushroom_tours WHERE id = p_tour_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_tour.status <> 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_active');
  END IF;

  IF now() < v_tour.auction_start_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_started');
  END IF;

  IF now() >= v_tour.auction_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'ended');
  END IF;

  -- Load existing participant (if any)
  SELECT * INTO v_part FROM public.tour_participants
    WHERE tour_id = p_tour_id AND user_id = p_user_id FOR UPDATE;
  v_is_new := NOT FOUND;

  IF v_is_new THEN
    v_min_required := v_tour.start_price;
  ELSE
    v_min_required := v_part.best_amount + v_tour.bid_step;
  END IF;

  IF p_amount < v_min_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_low',
      'min_required', v_min_required);
  END IF;

  -- Spend 1 REAL token (bonus not allowed)
  v_spend := public.spend_tokens(p_user_id, 1,
    'Ставка на грибном аукционе: ' || v_tour.title, false);
  IF coalesce((v_spend->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false,
      'error', coalesce(v_spend->>'error', 'insufficient'),
      'balance', coalesce((v_spend->>'balance')::numeric, 0));
  END IF;

  -- Record the bid action
  INSERT INTO public.tour_bids (tour_id, user_id, amount)
    VALUES (p_tour_id, p_user_id, p_amount);

  IF v_is_new THEN
    SELECT coalesce(max(participant_no), 0) + 1 INTO v_new_no
      FROM public.tour_participants WHERE tour_id = p_tour_id;
    INSERT INTO public.tour_participants
      (tour_id, user_id, participant_no, best_amount, best_amount_at,
       bids_count, tokens_spent, status, first_bid_at, updated_at)
      VALUES (p_tour_id, p_user_id, v_new_no, p_amount, now(),
              1, 1, 'bidding', now(), now());
  ELSE
    UPDATE public.tour_participants
      SET best_amount = p_amount,
          best_amount_at = now(),
          bids_count = bids_count + 1,
          tokens_spent = tokens_spent + 1,
          updated_at = now()
      WHERE tour_id = p_tour_id AND user_id = p_user_id;
    v_new_no := v_part.participant_no;
  END IF;

  -- Anti-snipe: extend the deadline if the bid lands in the final window
  IF v_tour.anti_snipe_seconds > 0
     AND (v_tour.auction_end_at - now()) < make_interval(secs => v_tour.anti_snipe_seconds) THEN
    UPDATE public.mushroom_tours
      SET auction_end_at = now() + make_interval(secs => v_tour.anti_snipe_seconds),
          updated_at = now()
      WHERE id = p_tour_id
      RETURNING auction_end_at INTO v_tour.auction_end_at;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'participant_no', v_new_no,
    'best_amount', p_amount,
    'balance', (v_spend->>'balance')::numeric,
    'auction_end_at', v_tour.auction_end_at
  );
END;
$$;


-- ============================================================
-- 7. get_tour_leaderboard — anonymized board + caller's own row
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tour_leaderboard(p_tour_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tour public.mushroom_tours;
  v_uid uuid := auth.uid();
  v_board jsonb;
  v_me jsonb;
BEGIN
  SELECT * INTO v_tour FROM public.mushroom_tours WHERE id = p_tour_id;
  IF NOT FOUND OR v_tour.status = 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.position), '[]'::jsonb)
    INTO v_board
  FROM (
    SELECT
      tp.participant_no,
      tp.best_amount,
      tp.status,
      (tp.user_id = v_uid) AS is_me,
      row_number() OVER (ORDER BY tp.best_amount DESC, tp.best_amount_at ASC) AS position
    FROM public.tour_participants tp
    WHERE tp.tour_id = p_tour_id
  ) t;

  SELECT row_to_json(m) INTO v_me
  FROM (
    SELECT participant_no, best_amount, bids_count, tokens_spent, status,
           rank, confirm_deadline, confirmed_at
    FROM public.tour_participants
    WHERE tour_id = p_tour_id AND user_id = v_uid
  ) m;

  RETURN jsonb_build_object(
    'success', true,
    'spots', v_tour.spots,
    'status', v_tour.status,
    'auction_start_at', v_tour.auction_start_at,
    'auction_end_at', v_tour.auction_end_at,
    'leaderboard', v_board,
    'me', v_me
  );
END;
$$;


-- ============================================================
-- 8. finalize_tour_auction — rank winners/waitlist, close auction
--    (idempotent: only acts on a 'published' tour past its end)
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_tour_auction(p_tour_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tour public.mushroom_tours;
BEGIN
  SELECT * INTO v_tour FROM public.mushroom_tours WHERE id = p_tour_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_tour.status <> 'published' THEN
    RETURN jsonb_build_object('success', true, 'finalized', false, 'status', v_tour.status);
  END IF;

  IF now() < v_tour.auction_end_at THEN
    RETURN jsonb_build_object('success', true, 'finalized', false);
  END IF;

  WITH ranked AS (
    SELECT user_id,
      row_number() OVER (ORDER BY best_amount DESC, best_amount_at ASC) AS rnk
    FROM public.tour_participants
    WHERE tour_id = p_tour_id
  )
  UPDATE public.tour_participants tp
    SET rank = r.rnk,
        status = CASE WHEN r.rnk <= v_tour.spots THEN 'winner' ELSE 'waitlist' END,
        confirm_deadline = CASE
          WHEN r.rnk <= v_tour.spots
          THEN now() + make_interval(hours => v_tour.confirm_window_hours)
          ELSE NULL END,
        updated_at = now()
    FROM ranked r
    WHERE tp.tour_id = p_tour_id AND tp.user_id = r.user_id;

  UPDATE public.mushroom_tours
    SET status = 'finished', finished_at = now(), updated_at = now()
    WHERE id = p_tour_id;

  RETURN jsonb_build_object('success', true, 'finalized', true);
END;
$$;


-- ============================================================
-- 9. promote_tour_waitlist — fill freed winner slots from waitlist
-- ============================================================

CREATE OR REPLACE FUNCTION public.promote_tour_waitlist(p_tour_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tour public.mushroom_tours;
  v_active integer;
  v_free integer;
  v_promoted integer := 0;
  r record;
BEGIN
  SELECT * INTO v_tour FROM public.mushroom_tours WHERE id = p_tour_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT count(*) INTO v_active FROM public.tour_participants
    WHERE tour_id = p_tour_id AND status IN ('winner', 'confirmed');

  v_free := v_tour.spots - v_active;
  IF v_free <= 0 THEN
    RETURN jsonb_build_object('success', true, 'promoted', 0);
  END IF;

  FOR r IN
    SELECT user_id FROM public.tour_participants
    WHERE tour_id = p_tour_id AND status = 'waitlist'
    ORDER BY rank ASC NULLS LAST
    LIMIT v_free
  LOOP
    UPDATE public.tour_participants
      SET status = 'winner',
          confirm_deadline = now() + make_interval(hours => v_tour.confirm_window_hours),
          updated_at = now()
      WHERE tour_id = p_tour_id AND user_id = r.user_id;
    v_promoted := v_promoted + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'promoted', v_promoted);
END;
$$;


-- ============================================================
-- 10. confirm / decline participation (winner actions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_tour_participation(
  p_tour_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_part public.tour_participants;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_part FROM public.tour_participants
    WHERE tour_id = p_tour_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;

  IF v_part.status NOT IN ('winner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_winner');
  END IF;

  IF v_part.confirm_deadline IS NOT NULL AND now() > v_part.confirm_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  UPDATE public.tour_participants
    SET status = 'confirmed', confirmed_at = now(), updated_at = now()
    WHERE tour_id = p_tour_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


CREATE OR REPLACE FUNCTION public.decline_tour_participation(
  p_tour_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_part public.tour_participants;
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_part FROM public.tour_participants
    WHERE tour_id = p_tour_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;

  IF v_part.status NOT IN ('winner', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_winner');
  END IF;

  UPDATE public.tour_participants
    SET status = 'declined', confirm_deadline = NULL, updated_at = now()
    WHERE tour_id = p_tour_id AND user_id = p_user_id;

  PERFORM public.promote_tour_waitlist(p_tour_id);

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ============================================================
-- 11. Cron helpers: finalize due auctions + expire confirmations
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_due_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.mushroom_tours
    WHERE status = 'published' AND now() >= auction_end_at
  LOOP
    PERFORM public.finalize_tour_auction(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'finalized', v_count);
END;
$$;


CREATE OR REPLACE FUNCTION public.expire_tour_confirmations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT tour_id FROM public.tour_participants
    WHERE status = 'winner' AND confirm_deadline IS NOT NULL AND now() > confirm_deadline
  LOOP
    UPDATE public.tour_participants
      SET status = 'expired', updated_at = now()
      WHERE tour_id = r.tour_id AND status = 'winner'
        AND confirm_deadline IS NOT NULL AND now() > confirm_deadline;
    PERFORM public.promote_tour_waitlist(r.tour_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'tours_processed', v_count);
END;
$$;
