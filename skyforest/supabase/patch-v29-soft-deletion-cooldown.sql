-- PATCH v29: Soft account deletion with 14-day cooldown
--
-- Instead of deleting immediately, the user schedules deletion and has
-- 14 days to cancel. A server-side cron finalizes the deletion after the
-- cooldown has elapsed.

-- ============================================================
-- 1. Profile flags for scheduled deletion
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_effective_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_effective_at
  ON public.profiles (deletion_effective_at)
  WHERE deletion_effective_at IS NOT NULL;

-- ============================================================
-- 2. Schedule / cancel helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.schedule_account_deletion(p_days integer DEFAULT 14)
RETURNS timestamptz AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_effective timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective := now() + make_interval(days => p_days);

  UPDATE public.profiles
     SET deletion_scheduled_at = now(),
         deletion_effective_at = v_effective
   WHERE id = v_uid;

  RETURN v_effective;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.schedule_account_deletion(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
     SET deletion_scheduled_at = NULL,
         deletion_effective_at = NULL
   WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- ============================================================
-- 3. Cron-friendly finalizer (service-role only)
-- ============================================================
--
-- Intended to be invoked by a scheduled job (e.g. Supabase cron or an
-- application-level cron hitting /api/cron/finalize-deletions). It records
-- an entry in deleted_accounts and removes the auth user via the admin API
-- separately — here we just return the list of user ids whose cooldown has
-- expired so the caller can action them.

CREATE OR REPLACE FUNCTION public.list_pending_deletions()
RETURNS TABLE (user_id uuid, email text, effective_at timestamptz) AS $$
  SELECT p.id, u.email::text, p.deletion_effective_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
   WHERE p.deletion_effective_at IS NOT NULL
     AND p.deletion_effective_at <= now();
$$ LANGUAGE sql SECURITY DEFINER;
