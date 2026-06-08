-- ============================================================================
--  Lift the Trophy — challenge win streak
--  Run in the Supabase dashboard → SQL Editor (needs owner privileges).
--  Adds the column the client writes (challenge_streak) and bounds it so the
--  "Top Win Streaks" board can't be stuffed with a single cheat row.
-- ============================================================================

-- 1. New column: the player's challenge win streak AFTER that game. Nullable —
--    only head-to-head challenge results set it; normal games leave it null.
alter table public.scores
  add column if not exists challenge_streak integer;

-- 2. Re-bound the row to include the new field (0..1000 is well beyond any real
--    streak). Mirrors the existing scores_sane checks so nothing else changes.
alter table public.scores drop constraint if exists scores_sane;
alter table public.scores
  add constraint scores_sane check (
        score >= 0 and score <= 100
    and char_length(player_name) between 2 and 24
    and char_length(coalesce(squad_url, '')) <= 2048
    and (squad_url is null or squad_url ~ '^https://')
    and mode in ('classic','expert','hardcore','daily')
    and (challenge_streak is null or (challenge_streak >= 0 and challenge_streak <= 1000))
  );

-- 3. Index for the streak leaderboard query (challenge_streak desc, filtered > 0).
create index if not exists scores_challenge_streak_idx
  on public.scores (challenge_streak desc)
  where challenge_streak is not null;
