-- PL/pgSQL resolves integer literals (e.g. 0) as integer, not smallint, so PERFORM
-- on party_log_event(uuid, text, text, smallint, jsonb) fails for join/leave/advance.
-- Accept integer for p_round and cast on insert; fix party_join_room call site.

drop function if exists public.party_log_event(uuid, text, text, smallint, jsonb);

create or replace function public.party_log_event(
  p_room_id uuid,
  p_event_type text,
  p_phase text default null,
  p_round integer default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count smallint;
begin
  select count(*)::smallint into v_count
  from public.party_players
  where room_id = p_room_id;

  insert into public.party_analytics_events (
    room_id,
    event_type,
    phase,
    round,
    player_count,
    meta
  )
  values (
    p_room_id,
    p_event_type,
    p_phase,
    p_round::smallint,
    v_count,
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.party_log_event(uuid, text, text, integer, jsonb) from public;

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

  select count(*) into v_count from public.party_players where room_id = v_room.id;
  if v_count >= 8 then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;

  insert into public.party_players (room_id, user_id, is_host)
  values (v_room.id, v_uid, false);

  perform public.party_log_event(
    v_room.id,
    'player_joined'::text,
    'waiting'::text,
    0
  );

  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end;
$$;

revoke all on function public.party_join_room(text) from public;
grant execute on function public.party_join_room(text) to authenticated;
