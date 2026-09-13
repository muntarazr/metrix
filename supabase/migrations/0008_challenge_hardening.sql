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
