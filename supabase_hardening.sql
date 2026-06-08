-- ============================================================================
--  Lift the Trophy — Supabase hardening
--  Run this in the Supabase dashboard → SQL Editor (needs owner privileges).
--  The public anon key in src/lib/supabase.js is meant to be public; all real
--  protection lives in these RLS policies / constraints. Verified 2026-06-08.
-- ============================================================================

-- 0. CLEAN UP the security-test row left during the audit (anon cannot delete).
delete from public.scores
where id = '130d123e-2370-49ce-a1a7-d281d2969030';
-- Sweep for any other junk from probing (optional safety net):
delete from public.scores
where squad_url like 'javascript:%'
   or squad_url like 'data:%'
   or score > 100;

-- 1. BOUND every inserted score. Stops 999999 "cheat" rows, enforces https-only
--    squad_url (kills the stored-XSS vector at the source), caps name length,
--    and restricts mode to known values. A CHECK constraint applies to every
--    write regardless of which RLS policy allowed it.
alter table public.scores drop constraint if exists scores_sane;
alter table public.scores
  add constraint scores_sane check (
        score >= 0 and score <= 100
    and char_length(player_name) between 2 and 24
    and char_length(coalesce(squad_url, '')) <= 2048
    and (squad_url is null or squad_url ~ '^https://')
    and mode in ('classic','expert','hardcore','daily')
  );

-- 2. Confirm RLS is ON and writes are insert-only for anon.
--    (Audit confirmed UPDATE/DELETE are already blocked — this makes it explicit.)
alter table public.scores enable row level security;

drop policy if exists "anon read scores"   on public.scores;
drop policy if exists "anon insert scores" on public.scores;

create policy "anon read scores"
  on public.scores for select to anon using (true);

create policy "anon insert scores"
  on public.scores for insert to anon with check (true);
-- No update/delete policies for anon  ->  both remain denied.

-- ============================================================================
-- 3. GROUPS — make "private" groups actually private.
--    Today anon can `select *` from groups and dump every code + name, so any
--    group is joinable by a stranger. Replace open table reads with a function
--    that only ever returns ONE group, looked up by its exact code.
-- ============================================================================
alter table public.groups enable row level security;

-- Remove broad read access (drop policies + revoke direct SELECT).
drop policy if exists "anon read groups"   on public.groups;
drop policy if exists "anon insert groups" on public.groups;

revoke select on public.groups from anon;

-- Creating a group is still fine. The client (createGroup) now uses
-- return=minimal and generates the code itself, so NO anon SELECT policy is
-- needed — groups become unenumerable.
create policy "anon insert groups"
  on public.groups for insert to anon with check (
    char_length(name) between 1 and 40
  );

-- Single-row lookup by exact code (SECURITY DEFINER bypasses RLS safely).
-- This is the only read path; the client's getGroup() calls it via
-- POST /rest/v1/rpc/get_group  { "p_code": code }.
create or replace function public.get_group(p_code text)
returns setof public.groups
language sql
security definer
set search_path = public
as $$
  select * from public.groups where code = upper(p_code) limit 1;
$$;
grant execute on function public.get_group(text) to anon;
