-- Keep word list in sync with lib/party/profanity.ts
create or replace function public.party_caption_has_profanity(p_caption text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(coalesce(p_caption, '')) like any (
    array['%slur1%', '%fuck%', '%shit%', '%asshole%']
  );
$$;

revoke all on function public.party_caption_has_profanity(text) from public;

create or replace function public.party_create_room(p_round_count smallint default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_room_id uuid;
  v_attempts int := 0;
  v_recent_creates int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select count(*) into v_recent_creates
  from public.party_rooms
  where host_id = v_uid and created_at > now() - interval '1 hour';

  if v_recent_creates >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if p_round_count not in (3, 5, 7) then
    p_round_count := 5;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.party_generate_code();
    begin
      insert into public.party_rooms (code, host_id, round_count)
      values (v_code, v_uid, p_round_count)
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      if v_attempts >= 8 then
        return jsonb_build_object('ok', false, 'error', 'code_collision');
      end if;
    end;
  end loop;

  insert into public.party_players (room_id, user_id, is_host)
  values (v_room_id, v_uid, true);

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

create or replace function public.party_join_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_count int;
  v_recent_joins int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;

  if v_room.status <> 'open' or v_room.phase <> 'waiting' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if exists (select 1 from public.party_players where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('ok', true, 'room_id', v_room.id);
  end if;

  select count(*) into v_recent_joins
  from public.party_players
  where user_id = v_uid and joined_at > now() - interval '1 minute';

  if v_recent_joins >= 10 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select count(*) into v_count from public.party_players where room_id = v_room.id;
  if v_count >= 8 then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;

  insert into public.party_players (room_id, user_id, is_host)
  values (v_room.id, v_uid, false);

  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end;
$$;

create or replace function public.party_submit_caption(p_room_id uuid, p_caption text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_caption text := trim(p_caption);
  v_submission_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if char_length(v_caption) < 1 or char_length(v_caption) > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_caption');
  end if;

  if public.party_caption_has_profanity(v_caption) then
    return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.phase <> 'caption' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if exists (
    select 1 from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_submitted');
  end if;

  insert into public.party_submissions (room_id, round, user_id, caption)
  values (p_room_id, v_room.current_round, v_uid, v_caption)
  returning id into v_submission_id;

  update public.party_rooms set caption_count = caption_count + 1 where id = p_room_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;
