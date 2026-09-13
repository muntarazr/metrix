-- ============================================================================
-- METRIX — complete database setup, one file.
--
-- Paste the whole thing into Supabase Dashboard → SQL Editor → Run.
--
-- Safe on ANY starting state: a brand-new project, or one where 0001–0004 were
-- already applied. Every statement is idempotent — tables use IF NOT EXISTS,
-- policies are dropped before being recreated, and the two milestone functions
-- are dropped first because their return type changed (Postgres refuses to
-- CREATE OR REPLACE a function into a different return type).
--
-- Running this makes 0005 unnecessary; it already contains every correction.
-- ============================================================================





-- ═══════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- METRIX — base schema
-- Reconstructed from application code. Run once on a fresh Supabase project,
-- in the Dashboard SQL Editor. Safe to re-run (everything is IF NOT EXISTS).
--
-- Column names, types and constraints are taken from what the app actually
-- reads and writes; where the code never reveals a constraint, the permissive
-- choice was made so nothing the app does can fail.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── goals ───────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  title                     text not null,
  domain                    text default 'other',
  ai_summary                text,
  icon                      text,
  status                    text not null default 'active',
  current_points            integer not null default 0,
  target_points             integer not null default 10000,
  total_days                integer,
  estimated_completion_date date,
  is_pinned                 boolean not null default false,
  created_at                timestamptz not null default now()
);
create index if not exists goals_user_id_idx on public.goals(user_id);

-- ── sub_layers (tasks: two levels, main -> sub) ──────────────────────────────
create table if not exists public.sub_layers (
  id                    uuid primary key default gen_random_uuid(),
  goal_id               uuid not null references public.goals(id) on delete cascade,
  parent_task_id        uuid references public.sub_layers(id) on delete cascade,
  task_description      text not null,
  task_type             text not null default 'sub'   check (task_type in ('main','sub')),
  frequency             text not null default 'daily' check (frequency in ('daily','weekly')),
  impact_weight         integer not null default 1,
  completion_criteria   text default '',
  time_required_minutes integer not null default 0,
  sort_order            integer not null default 0,
  icon                  text,
  accent_color          text,
  is_pinned             boolean not null default false,
  created_at            timestamptz not null default now()
);
create index if not exists sub_layers_goal_id_idx on public.sub_layers(goal_id);
create index if not exists sub_layers_parent_idx  on public.sub_layers(parent_task_id);

-- ── task_checkins (one row per task per period) ──────────────────────────────
create table if not exists public.task_checkins (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.goals(id) on delete cascade,
  task_id      uuid not null references public.sub_layers(id) on delete cascade,
  period_type  text not null check (period_type in ('daily','weekly')),
  period_start date not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (task_id, period_type, period_start)
);
create index if not exists task_checkins_goal_period_idx
  on public.task_checkins(goal_id, period_start);

-- ── daily_logs (progress reports + AI verdict; milestones live here too) ─────
create table if not exists public.daily_logs (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references public.goals(id) on delete cascade,
  user_input       text,
  ai_score         integer not null default 0,
  ai_feedback      text,
  coaching_message text,
  breakdown        jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists daily_logs_goal_created_idx
  on public.daily_logs(goal_id, created_at desc);

-- ── daily_focus_answers (one generated question per goal per day) ────────────
create table if not exists public.daily_focus_answers (
  id              uuid primary key default gen_random_uuid(),
  goal_id         uuid not null references public.goals(id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prompt_date     date not null,
  angle_label     text,
  question        text not null,
  question_why    text,
  answer          text,
  answer_coaching text,
  suggestions     jsonb not null default '[]'::jsonb,
  answered_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- the app upserts with onConflict: "goal_id,prompt_date"
  unique (goal_id, prompt_date)
);

-- ── goal_reminders ──────────────────────────────────────────────────────────
create table if not exists public.goal_reminders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  goal_id        uuid not null references public.goals(id) on delete cascade,
  reminder_time  time not null,
  reminder_count integer not null default 3,
  enabled        boolean not null default true,
  -- PATCH /api/goal-reminders accepts a timezone field; without the column the
  -- update errors out the moment a client sends one
  timezone       text,
  created_at     timestamptz not null default now()
);
create index if not exists goal_reminders_user_idx on public.goal_reminders(user_id);

-- Reconciliation for databases created before this column existed: CREATE TABLE
-- IF NOT EXISTS is a no-op on an existing table, so a new column has to be added
-- explicitly or it silently never appears.
alter table public.goal_reminders add column if not exists timezone text;

-- ── challenge_rooms / challenge_participants (1v1 duels) ─────────────────────
create table if not exists public.challenge_rooms (
  id          uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create table if not exists public.challenge_participants (
  id                     uuid primary key default gen_random_uuid(),
  challenge_id           uuid not null references public.challenge_rooms(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade,
  goal_id                uuid not null references public.goals(id) on delete cascade,
  role                   text not null check (role in ('host','guest')),
  display_name_snapshot  text,
  avatar_url_snapshot    text,
  goal_title_snapshot    text,
  joined_at              timestamptz not null default now(),
  left_at                timestamptz,
  unique (challenge_id, user_id)
);
create index if not exists challenge_participants_user_idx on public.challenge_participants(user_id);
create index if not exists challenge_participants_goal_idx on public.challenge_participants(goal_id);

-- keep daily_focus_answers.updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_focus_answers_touch on public.daily_focus_answers;
create trigger daily_focus_answers_touch
  before update on public.daily_focus_answers
  for each row execute function public.touch_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY  (helpers must precede the policies that call them)
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- METRIX — RPC functions
--
-- Parameter names below are the exact keys the app sends; renaming any of them
-- breaks the call. The challenge functions signal failure by raising an
-- exception whose message contains a code string that
-- src/app/api/challenges/shared.ts maps to an HTTP status.
-- ============================================================================

-- ── points ──────────────────────────────────────────────────────────────────
-- Called with a negative value to revert a deleted milestone, so it must allow
-- decrements — but never let a goal fall below zero.
create or replace function public.increment_goal_points(
  goal_uuid     uuid,
  points_to_add integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.goals
     set current_points = greatest(0, current_points + points_to_add)
   where id = goal_uuid
     and user_id = auth.uid();

  if not found then
    raise exception 'goal_not_owned';
  end if;
end;
$$;

-- ── milestones: log + points, atomically ──────────────────────────────────
-- Returns jsonb, not a table: the route reads rpcData.log_id off a plain
-- object, and PostgREST wraps a RETURNS TABLE result in an array.
-- The raised strings are matched by getRpcHttpStatus() in the route.
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

-- ── challenges ──────────────────────────────────────────────────────────────
create or replace function public.metrix_new_invite_code()
returns text
language plpgsql
as $$
declare
  -- no 0/O/1/I: these codes get read aloud and retyped
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for _ in 1..6 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.challenge_rooms where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_goal_challenge(
  p_goal_id      uuid,
  p_display_name text,
  p_avatar_url   text
)
returns table (challenge_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_room   uuid;
  v_code   text;
  v_title  text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select title into v_title
    from public.goals where id = p_goal_id and user_id = v_user;

  if v_title is null then
    raise exception 'goal_not_owned';
  end if;

  if exists (
    select 1
      from public.challenge_participants p
      join public.challenge_rooms r on r.id = p.challenge_id
     where p.user_id = v_user
       and p.left_at is null
       and r.ended_at is null
  ) then
    raise exception 'active_challenge_exists';
  end if;

  v_code := public.metrix_new_invite_code();

  insert into public.challenge_rooms (invite_code, created_by)
  values (v_code, v_user)
  returning id into v_room;

  insert into public.challenge_participants
    (challenge_id, user_id, goal_id, role,
     display_name_snapshot, avatar_url_snapshot, goal_title_snapshot)
  values
    (v_room, v_user, p_goal_id, 'host', p_display_name, p_avatar_url, v_title);

  challenge_id := v_room;
  invite_code  := v_code;
  return next;
end;
$$;

create or replace function public.join_goal_challenge(
  p_invite_code  text,
  p_goal_id      uuid,
  p_display_name text,
  p_avatar_url   text
)
returns table (challenge_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_room  uuid;
  v_ended timestamptz;
  v_host  uuid;
  v_title text;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_invite_code is null or length(trim(p_invite_code)) = 0 then
    raise exception 'invalid_invite_code';
  end if;

  select id, ended_at, created_by into v_room, v_ended, v_host
    from public.challenge_rooms
   where invite_code = upper(trim(p_invite_code));

  if v_room is null then
    raise exception 'challenge_not_found';
  end if;

  if v_ended is not null then
    raise exception 'challenge_ended';
  end if;

  if v_host = v_user then
    raise exception 'cannot_join_own_challenge';
  end if;

  if exists (
    select 1 from public.challenge_participants
     where challenge_id = v_room and user_id = v_user and left_at is null
  ) then
    raise exception 'already_joined';
  end if;

  select count(*) into v_count
    from public.challenge_participants
   where challenge_id = v_room and left_at is null;

  if v_count >= 2 then
    raise exception 'challenge_full';
  end if;

  select title into v_title
    from public.goals where id = p_goal_id and user_id = v_user;

  if v_title is null then
    raise exception 'goal_not_owned';
  end if;

  insert into public.challenge_participants
    (challenge_id, user_id, goal_id, role,
     display_name_snapshot, avatar_url_snapshot, goal_title_snapshot)
  values
    (v_room, v_user, p_goal_id, 'guest', p_display_name, p_avatar_url, v_title)
  on conflict (challenge_id, user_id) do update
    set left_at             = null,
        goal_id             = excluded.goal_id,
        goal_title_snapshot = excluded.goal_title_snapshot;

  challenge_id := v_room;
  select r.invite_code into invite_code from public.challenge_rooms r where r.id = v_room;
  return next;
end;
$$;

create or replace function public.end_goal_challenge(
  p_challenge_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.challenge_participants
     where challenge_id = p_challenge_id and user_id = v_user
  ) then
    raise exception 'not_challenge_member';
  end if;

  update public.challenge_rooms
     set ended_at = now()
   where id = p_challenge_id and ended_at is null;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- METRIX — storage buckets
--
-- Both buckets are public because the app hands their getPublicUrl() straight
-- to <img>. Writes stay restricted.
--   avatars    — uploaded by the user, path is "<user_id>/avatar.<ext>"
--   milestones — written server-side with the service role key
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('milestones', 'milestones', true)
on conflict (id) do update set public = true;

-- ── avatars ─────────────────────────────────────────────────────────────────
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

-- a user may only write inside their own <user_id>/ folder
drop policy if exists avatars_own_write on storage.objects;
create policy avatars_own_write on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_own_update on storage.objects;
create policy avatars_own_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_own_delete on storage.objects;
create policy avatars_own_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── milestones ──────────────────────────────────────────────────────────────
-- Read is public; no write policy is declared, so only the service role key
-- (which bypasses RLS) can upload — matching how the API route writes them.
drop policy if exists milestones_public_read on storage.objects;
create policy milestones_public_read on storage.objects
  for select using (bucket_id = 'milestones');
-- ============================================================================
-- 0006 — adaptive follow-up: rest days, skip reasons, mini versions, reviews
--
-- Idempotent. Safe to run on a database that already has 0001–0005, and safe
-- to run twice. Nothing here drops or rewrites existing data.
-- ============================================================================

-- ── goals.streak_freezes ────────────────────────────────────────────────────
-- Array of local date keys ('YYYY-MM-DD') the user spent as rest days. One per
-- Monday-start week is enforced in the app (src/lib/streak.ts), not here, so
-- the budget can change without a migration.
alter table public.goals
  add column if not exists streak_freezes jsonb not null default '[]'::jsonb;

-- ── sub_layers.mini_version ─────────────────────────────────────────────────
-- The two-minute version of the task, generated on demand by Gemini and cached
-- here. Null means "not generated yet", not "unavailable".
alter table public.sub_layers
  add column if not exists mini_version text;

-- ── task_checkins: why it did not happen, and how it did ────────────────────
-- A skipped task now gets a row too: completed = false plus a reason. The
-- existing unique (task_id, period_type, period_start) keeps one row per period
-- whether the user finished it, skipped it, or changed their mind.
alter table public.task_checkins
  add column if not exists skip_reason text;

alter table public.task_checkins
  add column if not exists completed_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_checkins_skip_reason_check'
  ) then
    alter table public.task_checkins
      add constraint task_checkins_skip_reason_check
      check (skip_reason is null or skip_reason in ('no_time','too_hard','unclear','no_mood'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_checkins_completed_mode_check'
  ) then
    alter table public.task_checkins
      add constraint task_checkins_completed_mode_check
      check (completed_mode is null or completed_mode in ('full','mini'));
  end if;
end $$;

-- ── weekly_reviews ──────────────────────────────────────────────────────────
-- One generated review per goal per Monday-start week. Deliberately NOT a
-- daily_logs row: daily_logs is what the streak counts, and a generated review
-- is not a day the user showed up.
create table if not exists public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start  date not null,
  summary     text not null default '',
  patterns    jsonb not null default '[]'::jsonb,
  suggestion  text not null default '',
  stats       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  -- the route upserts with onConflict: "goal_id,week_start"
  unique (goal_id, week_start)
);
create index if not exists weekly_reviews_goal_week_idx
  on public.weekly_reviews(goal_id, week_start desc);

alter table public.weekly_reviews enable row level security;

drop policy if exists weekly_reviews_own on public.weekly_reviews;
create policy weekly_reviews_own on public.weekly_reviews
  for all using (
    exists (select 1 from public.goals g where g.id = weekly_reviews.goal_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.goals g where g.id = weekly_reviews.goal_id and g.user_id = auth.uid())
  );
-- ============================================================================
-- 0007 — per-user AI usage limits
--
-- Reserves an accepted AI attempt before the external provider is called.
-- PostgreSQL is the shared authority across web, Capacitor and multiple app
-- instances; an in-memory counter would not enforce a production-wide limit.
-- ============================================================================

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'mistral')),
  operation text not null check (operation in (
    'investigate',
    'plan',
    'daily_focus',
    'evaluate',
    'milestone_evaluate',
    'ai_edit',
    'task_mini',
    'weekly_review',
    'transcribe'
  )),
  requested_at timestamptz not null default now(),
  outcome text not null default 'reserved' check (outcome in ('reserved', 'succeeded', 'provider_rejected', 'failed')),
  provider_status integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_limit_idx
  on public.ai_usage_events (user_id, provider, requested_at desc);

alter table public.ai_usage_events enable row level security;

create or replace function public.consume_ai_quota(
  p_provider text,
  p_operation text
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining_minute integer,
  remaining_day integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_minute_limit integer;
  v_day_limit integer;
  v_minute_count integer;
  v_day_count integer;
  v_oldest_minute timestamptz;
  v_oldest_day timestamptz;
  v_retry_after integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if (p_provider = 'gemini' and p_operation not in (
    'investigate', 'plan', 'daily_focus', 'evaluate', 'milestone_evaluate',
    'ai_edit', 'task_mini', 'weekly_review'
  )) or (p_provider = 'mistral' and p_operation <> 'transcribe') or p_provider not in ('gemini', 'mistral') then
    raise exception 'invalid_ai_operation';
  end if;

  v_minute_limit := case when p_provider = 'gemini' then 6 else 3 end;
  v_day_limit := case when p_provider = 'gemini' then 30 else 10 end;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_provider, 0));

  select count(*), min(requested_at)
    into v_minute_count, v_oldest_minute
  from public.ai_usage_events
  where user_id = v_user_id
    and provider = p_provider
    and requested_at >= now() - interval '60 seconds';

  select count(*), min(requested_at)
    into v_day_count, v_oldest_day
  from public.ai_usage_events
  where user_id = v_user_id
    and provider = p_provider
    and requested_at >= date_trunc('day', now());

  if v_minute_count >= v_minute_limit then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_oldest_minute + interval '60 seconds' - now())))::integer);
    return query select false, v_retry_after, 0, greatest(0, v_day_limit - v_day_count);
    return;
  end if;

  if v_day_count >= v_day_limit then
    v_retry_after := greatest(1, ceil(extract(epoch from (date_trunc('day', now()) + interval '1 day' - now())))::integer);
    return query select false, v_retry_after, greatest(0, v_minute_limit - v_minute_count), 0;
    return;
  end if;

  insert into public.ai_usage_events (user_id, provider, operation)
  values (v_user_id, p_provider, p_operation);

  return query select true, 0, v_minute_limit - v_minute_count - 1, v_day_limit - v_day_count - 1;
end;
$$;

revoke all on function public.consume_ai_quota(text, text) from public;
grant execute on function public.consume_ai_quota(text, text) to authenticated;

-- ============================================================================
-- 0008 — challenge race conditions + stronger invite codes
--
-- create_goal_challenge and join_goal_challenge both did a "check, then act"
-- without a lock: two concurrent calls from the same user (create) or two
-- concurrent joiners of the same room (join) could both pass their check
-- before either insert landed, breaking the "one active challenge per user"
-- and "two participants per room" invariants. Advisory locks scoped to the
-- relevant row serialize just the callers who could actually collide.
--
-- Idempotent. Safe to run on a database that already has 0001-0007.
-- ============================================================================

-- 6 chars over a 32-symbol alphabet is ~30 bits — guessable by a patient
-- authenticated attacker with no rate limit on join_goal_challenge. 10 chars
-- raises that to ~50 bits while staying readable/typeable.
create or replace function public.metrix_new_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for _ in 1..10 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.challenge_rooms where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_goal_challenge(
  p_goal_id      uuid,
  p_display_name text,
  p_avatar_url   text
)
returns table (challenge_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_room   uuid;
  v_code   text;
  v_title  text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Serializes concurrent create calls from the SAME user; a second user
  -- creating their own challenge takes a different lock key and proceeds
  -- without waiting.
  perform pg_advisory_xact_lock(hashtextextended('challenge_create:' || v_user::text, 0));

  select title into v_title
    from public.goals where id = p_goal_id and user_id = v_user;

  if v_title is null then
    raise exception 'goal_not_owned';
  end if;

  if exists (
    select 1
      from public.challenge_participants p
      join public.challenge_rooms r on r.id = p.challenge_id
     where p.user_id = v_user
       and p.left_at is null
       and r.ended_at is null
  ) then
    raise exception 'active_challenge_exists';
  end if;

  v_code := public.metrix_new_invite_code();

  insert into public.challenge_rooms (invite_code, created_by)
  values (v_code, v_user)
  returning id into v_room;

  insert into public.challenge_participants
    (challenge_id, user_id, goal_id, role,
     display_name_snapshot, avatar_url_snapshot, goal_title_snapshot)
  values
    (v_room, v_user, p_goal_id, 'host', p_display_name, p_avatar_url, v_title);

  challenge_id := v_room;
  invite_code  := v_code;
  return next;
end;
$$;

create or replace function public.join_goal_challenge(
  p_invite_code  text,
  p_goal_id      uuid,
  p_display_name text,
  p_avatar_url   text
)
returns table (challenge_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_room  uuid;
  v_ended timestamptz;
  v_host  uuid;
  v_title text;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_invite_code is null or length(trim(p_invite_code)) = 0 then
    raise exception 'invalid_invite_code';
  end if;

  select id, ended_at, created_by into v_room, v_ended, v_host
    from public.challenge_rooms
   where invite_code = upper(trim(p_invite_code));

  if v_room is null then
    raise exception 'challenge_not_found';
  end if;

  -- Serializes concurrent joins targeting the SAME room, so two simultaneous
  -- "second player" requests cannot both pass the 2-participant check below.
  perform pg_advisory_xact_lock(hashtextextended('challenge_join:' || v_room::text, 0));

  if v_ended is not null then
    raise exception 'challenge_ended';
  end if;

  if v_host = v_user then
    raise exception 'cannot_join_own_challenge';
  end if;

  if exists (
    select 1 from public.challenge_participants
     where challenge_id = v_room and user_id = v_user and left_at is null
  ) then
    raise exception 'already_joined';
  end if;

  select count(*) into v_count
    from public.challenge_participants
   where challenge_id = v_room and left_at is null;

  if v_count >= 2 then
    raise exception 'challenge_full';
  end if;

  select title into v_title
    from public.goals where id = p_goal_id and user_id = v_user;

  if v_title is null then
    raise exception 'goal_not_owned';
  end if;

  insert into public.challenge_participants
    (challenge_id, user_id, goal_id, role,
     display_name_snapshot, avatar_url_snapshot, goal_title_snapshot)
  values
    (v_room, v_user, p_goal_id, 'guest', p_display_name, p_avatar_url, v_title)
  on conflict (challenge_id, user_id) do update
    set left_at             = null,
        goal_id             = excluded.goal_id,
        goal_title_snapshot = excluded.goal_title_snapshot;

  challenge_id := v_room;
  select r.invite_code into invite_code from public.challenge_rooms r where r.id = v_room;
  return next;
end;
$$;

grant execute on function public.create_goal_challenge(uuid, text, text) to authenticated;
grant execute on function public.join_goal_challenge(text, uuid, text, text) to authenticated;
