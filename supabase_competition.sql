-- ============================================================================
--  Lift the Trophy — separate World Cup / Premier League leaderboards
--  Run in Supabase dashboard → SQL Editor (owner privileges).
--  Adds a `competition` tag to every score so the two boards are independent.
--  Existing rows are all World Cup, so they backfill to 'wc'.
-- ============================================================================

-- 1. Tag column. Default 'wc' backfills every existing row + protects any
--    insert that somehow omits it.
alter table public.scores
  add column if not exists competition text not null default 'wc';

-- 2. Fold the tag into the bounds CHECK (only the two known competitions).
alter table public.scores drop constraint if exists scores_sane;
alter table public.scores
  add constraint scores_sane check (
        score >= 0 and score <= 100
    and char_length(player_name) between 2 and 24
    and char_length(coalesce(squad_url, '')) <= 2048
    and (squad_url is null or squad_url ~ '^https://')
    and mode in ('classic','expert','hardcore','daily')
    and competition in ('wc','pl')
  );

-- 3. Index the filter the leaderboard queries on.
create index if not exists scores_competition_idx on public.scores (competition);
