-- PATCH v43: История походов («Вернуться к точке входа»)
--
-- Применяется вручную в Supabase SQL Editor.
--
-- Таблица tracks: завершённые походы пользователя. Точки хранятся jsonb-массивом
-- [{lat, lng, t}] (t — unix ms), первая точка — якорь (вход в лес). Перед
-- сохранением клиент прореживает точки (Douglas–Peucker ~15 м), поэтому
-- обычный поход — десятки-сотни точек, jsonb не раздувается.
-- RLS: пользователь видит и меняет только свои треки.

CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  distance_m integer NOT NULL DEFAULT 0,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracks_user_finished
  ON public.tracks (user_id, finished_at DESC);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tracks" ON public.tracks;
CREATE POLICY "Users can view own tracks"
  ON public.tracks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tracks" ON public.tracks;
CREATE POLICY "Users can insert own tracks"
  ON public.tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tracks" ON public.tracks;
CREATE POLICY "Users can update own tracks"
  ON public.tracks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tracks" ON public.tracks;
CREATE POLICY "Users can delete own tracks"
  ON public.tracks FOR DELETE
  USING (auth.uid() = user_id);
