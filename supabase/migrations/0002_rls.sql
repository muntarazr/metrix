-- ============================================================================
-- METRIX — Row Level Security
--
-- Without this every signed-in user can read every other user's goals. Ownership
-- always resolves back to goals.user_id; child tables are reached through their
-- goal. Challenge tables are the deliberate exception: an opponent must be able
-- to see the other player's room membership, so reads there are scoped to rooms
-- the caller belongs to rather than to rows they own.
-- ============================================================================

alter table public.goals                  enable row level security;
alter table public.sub_layers             enable row level security;
alter table public.task_checkins          enable row level security;
alter table public.daily_logs             enable row level security;
alter table public.daily_focus_answers    enable row level security;
alter table public.goal_reminders         enable row level security;
alter table public.challenge_rooms        enable row level security;
alter table public.challenge_participants enable row level security;

-- ── membership helpers ──────────────────────────────────────────────────────
-- These must be SECURITY DEFINER. Asking "is the caller in this challenge?" by
-- selecting from challenge_participants inside that table's own policy makes
-- Postgres re-enter the policy forever (error 42P17). A definer function runs
-- as the table owner, where RLS does not apply, which breaks the loop.
create or replace function public.my_challenge_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select challenge_id from public.challenge_participants where user_id = auth.uid();
$$;

create or replace function public.my_challenge_goal_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select p.goal_id
    from public.challenge_participants p
   where p.challenge_id in (
     select challenge_id from public.challenge_participants where user_id = auth.uid()
   );
$$;

grant execute on function public.my_challenge_ids()      to authenticated, anon;
grant execute on function public.my_challenge_goal_ids() to authenticated, anon;


-- ── goals ───────────────────────────────────────────────────────────────────
drop policy if exists goals_own on public.goals;
create policy goals_own on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- opponents may read the title of a goal entered into a shared challenge
drop policy if exists goals_read_challenge_opponent on public.goals;
create policy goals_read_challenge_opponent on public.goals
  for select using (
    id in (select public.my_challenge_goal_ids())
  );

-- ── child tables, owned through the parent goal ─────────────────────────────
drop policy if exists sub_layers_own on public.sub_layers;
create policy sub_layers_own on public.sub_layers
  for all using (
    exists (select 1 from public.goals g where g.id = sub_layers.goal_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.goals g where g.id = sub_layers.goal_id and g.user_id = auth.uid())
  );

drop policy if exists task_checkins_own on public.task_checkins;
create policy task_checkins_own on public.task_checkins
  for all using (
    exists (select 1 from public.goals g where g.id = task_checkins.goal_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.goals g where g.id = task_checkins.goal_id and g.user_id = auth.uid())
  );

drop policy if exists daily_logs_own on public.daily_logs;
create policy daily_logs_own on public.daily_logs
  for all using (
    exists (select 1 from public.goals g where g.id = daily_logs.goal_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.goals g where g.id = daily_logs.goal_id and g.user_id = auth.uid())
  );

-- the duel scoreboard reads the opponent's scores, not their text
drop policy if exists daily_logs_read_challenge_opponent on public.daily_logs;
create policy daily_logs_read_challenge_opponent on public.daily_logs
  for select using (
    goal_id in (select public.my_challenge_goal_ids())
  );

drop policy if exists daily_focus_own on public.daily_focus_answers;
create policy daily_focus_own on public.daily_focus_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists goal_reminders_own on public.goal_reminders;
create policy goal_reminders_own on public.goal_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── challenges ──────────────────────────────────────────────────────────────
-- Rooms and memberships are written only by the SECURITY DEFINER functions in
-- 0003, so these policies grant reads and nothing else.
drop policy if exists challenge_rooms_member_read on public.challenge_rooms;
create policy challenge_rooms_member_read on public.challenge_rooms
  for select using (
    created_by = auth.uid()
    or id in (select public.my_challenge_ids())
  );

drop policy if exists challenge_participants_member_read on public.challenge_participants;
create policy challenge_participants_member_read on public.challenge_participants
  for select using (
    user_id = auth.uid()
    or challenge_id in (select public.my_challenge_ids())
  );
