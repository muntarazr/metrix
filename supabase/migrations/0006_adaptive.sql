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
