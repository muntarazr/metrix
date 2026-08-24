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
