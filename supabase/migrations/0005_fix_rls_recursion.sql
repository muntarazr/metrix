-- ============================================================================
-- METRIX — corrective migration
--
-- Run this once, after 0001–0004. It repairs three things the first pass got
-- wrong. Safe to re-run.
--
--   1. Infinite recursion in the challenge policies (error 42P17), which took
--      goals, sub_layers, task_checkins, daily_logs and both challenge tables
--      offline.
--   2. record_goal_milestone returned a TABLE, so PostgREST wrapped it in an
--      array and the route could never read .log_id — milestones would save
--      but come back without an id.
--   3. The milestone functions raised error codes the API route does not
--      recognise, so every failure surfaced as a generic 500.
--   4. goal_reminders was missing the `timezone` column its PATCH handler writes.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS recursion
-- ─────────────────────────────────────────────────────────────────────────────
-- Asking "is the caller a member of this challenge?" by selecting from
-- challenge_participants inside that table's own SELECT policy makes Postgres
-- re-enter the policy forever. A SECURITY DEFINER function runs as the table
-- owner, where RLS does not apply, which breaks the loop.
--
-- These are deliberately not inlinable: Postgres never inlines a SQL function
-- that is SECURITY DEFINER or carries a SET clause, so the definer context is
-- guaranteed to survive.

create or replace function public.my_challenge_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select challenge_id
    from public.challenge_participants
   where user_id = auth.uid();
$$;

-- every goal entered into a challenge the caller is part of — theirs and the
-- opponent's; this is what makes the shared scoreboard readable
create or replace function public.my_challenge_goal_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.goal_id
    from public.challenge_participants p
   where p.challenge_id in (
     select challenge_id
       from public.challenge_participants
      where user_id = auth.uid()
   );
$$;

grant execute on function public.my_challenge_ids()      to authenticated, anon;
grant execute on function public.my_challenge_goal_ids() to authenticated, anon;

drop policy if exists challenge_participants_member_read on public.challenge_participants;
create policy challenge_participants_member_read on public.challenge_participants
  for select using (
    user_id = auth.uid()
    or challenge_id in (select public.my_challenge_ids())
  );

drop policy if exists challenge_rooms_member_read on public.challenge_rooms;
create policy challenge_rooms_member_read on public.challenge_rooms
  for select using (
    created_by = auth.uid()
    or id in (select public.my_challenge_ids())
  );

drop policy if exists goals_read_challenge_opponent on public.goals;
create policy goals_read_challenge_opponent on public.goals
  for select using (
    id in (select public.my_challenge_goal_ids())
  );

drop policy if exists daily_logs_read_challenge_opponent on public.daily_logs;
create policy daily_logs_read_challenge_opponent on public.daily_logs
  for select using (
    goal_id in (select public.my_challenge_goal_ids())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 + 3. Milestone functions: return shape and error codes
-- ─────────────────────────────────────────────────────────────────────────────
-- The route reads `rpcData.log_id` off the response object. A function that
-- RETURNS TABLE comes back from PostgREST as [{...}], so it must return jsonb
-- to arrive as a plain object.
--
-- Error strings must be exactly these — getRpcHttpStatus() in
-- src/app/api/goal/milestone/route.ts matches on them to pick 400/404.

drop function if exists public.record_goal_milestone(uuid, text, integer, text, jsonb);

create or replace function public.record_goal_milestone(
  p_goal_id     uuid,
  p_user_input  text,
  p_ai_score    integer,
  p_ai_feedback text,
  p_breakdown   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  if not exists (
    select 1 from public.goals where id = p_goal_id and user_id = auth.uid()
  ) then
    raise exception 'goal_not_found_or_access_denied';
  end if;

  insert into public.daily_logs (goal_id, user_input, ai_score, ai_feedback, breakdown)
  values (p_goal_id, p_user_input, p_ai_score, p_ai_feedback, coalesce(p_breakdown, '{}'::jsonb))
  returning id into v_log_id;

  update public.goals
     set current_points = greatest(0, current_points + coalesce(p_ai_score, 0))
   where id = p_goal_id;

  return jsonb_build_object('log_id', v_log_id);
end;
$$;

drop function if exists public.delete_goal_milestone(uuid, uuid);

create or replace function public.delete_goal_milestone(
  p_goal_id uuid,
  p_log_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score     integer;
  v_breakdown jsonb;
begin
  if not exists (
    select 1 from public.goals where id = p_goal_id and user_id = auth.uid()
  ) then
    raise exception 'goal_not_found_or_access_denied';
  end if;

  select ai_score, breakdown
    into v_score, v_breakdown
    from public.daily_logs
   where id = p_log_id and goal_id = p_goal_id;

  if not found then
    raise exception 'log_not_found_or_access_denied';
  end if;

  -- refuse to delete an ordinary progress log through the milestone endpoint
  if v_breakdown is null or v_breakdown -> 'milestone' is null then
    raise exception 'not_a_milestone';
  end if;

  delete from public.daily_logs where id = p_log_id and goal_id = p_goal_id;

  update public.goals
     set current_points = greatest(0, current_points - coalesce(v_score, 0))
   where id = p_goal_id;
end;
$$;

grant execute on function public.record_goal_milestone(uuid, text, integer, text, jsonb) to authenticated;
grant execute on function public.delete_goal_milestone(uuid, uuid)                       to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Missing column
-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH /api/goal-reminders builds its update object dynamically and can set a
-- `timezone` field, which 0001 did not declare.
alter table public.goal_reminders add column if not exists timezone text;
