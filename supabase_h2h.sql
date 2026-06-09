-- Run this in the Supabase SQL editor to enable the single-link H2H flow.
-- Creates the h2h_sessions table: one row per seed, stores both players' data.

CREATE TABLE IF NOT EXISTS public.h2h_sessions (
  seed         text PRIMARY KEY,
  formation    text NOT NULL,
  competition  text NOT NULL DEFAULT 'wc',
  p1_name      text,
  p1_score     int,
  p1_squad_url text,
  p1_tier      text,
  p1_at        timestamptz DEFAULT now(),
  p2_name      text,
  p2_score     int,
  p2_squad_url text,
  p2_tier      text,
  p2_at        timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.h2h_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read any session (needed to show comparison to both players).
CREATE POLICY "h2h_select" ON public.h2h_sessions
  FOR SELECT USING (true);

-- Anyone can create a new session (first player, p1 slot).
CREATE POLICY "h2h_insert" ON public.h2h_sessions
  FOR INSERT WITH CHECK (true);

-- Anyone can join an open session (p2 slot not yet filled).
CREATE POLICY "h2h_update_p2" ON public.h2h_sessions
  FOR UPDATE USING (p2_score IS NULL);
