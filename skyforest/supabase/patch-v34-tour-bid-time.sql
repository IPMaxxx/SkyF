-- PATCH v34: expose the time of each participant's best bid in the auction hall.
-- Re-creates get_tour_leaderboard so the anonymized board rows and the caller's
-- own row include best_amount_at (when the current leading offer was placed).

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
      tp.best_amount_at,
      tp.status,
      (tp.user_id = v_uid) AS is_me,
      row_number() OVER (ORDER BY tp.best_amount DESC, tp.best_amount_at ASC) AS position
    FROM public.tour_participants tp
    WHERE tp.tour_id = p_tour_id
  ) t;

  SELECT row_to_json(m) INTO v_me
  FROM (
    SELECT participant_no, best_amount, best_amount_at, bids_count, tokens_spent, status,
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
