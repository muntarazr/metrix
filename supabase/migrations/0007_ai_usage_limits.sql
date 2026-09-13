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
