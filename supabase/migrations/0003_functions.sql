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
