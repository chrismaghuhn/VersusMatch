-- party_log_event expects (uuid, text, text, smallint, jsonb).
-- PL/pgSQL string/integer literals resolve as unknown/integer and fail PERFORM lookup.
create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 0
)
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
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_round_count not in (3, 5, 7) then
    p_round_count := 5;
  end if;

  if p_rerolls_per_player < 0 then
    p_rerolls_per_player := 0;
  end if;

  if p_rerolls_per_player > p_round_count then
    return jsonb_build_object('ok', false, 'error', 'invalid_rerolls');
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.party_generate_code();
    begin
      insert into public.party_rooms (code, host_id, round_count, rerolls_per_player)
      values (v_code, v_uid, p_round_count, p_rerolls_per_player)
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

  perform public.party_log_event(
    v_room_id,
    'room_created'::text,
    'waiting'::text,
    0::smallint,
    jsonb_build_object(
      'round_count', p_round_count,
      'rerolls_per_player', p_rerolls_per_player
    )
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

create or replace function public.party_start_game(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_players int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if v_room.phase <> 'waiting' or v_room.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  select count(*) into v_players from public.party_players where room_id = p_room_id;
  if v_players < 2 then
    return jsonb_build_object('ok', false, 'error', 'not_enough_players');
  end if;

  delete from public.party_reactions where room_id = p_room_id;

  perform public.party_assign_player_templates(p_room_id, 1);

  update public.party_rooms set
    status = 'in_progress',
    current_round = 1,
    phase = 'caption',
    caption_count = 0,
    votes_cast_count = 0,
    phase_seed = (hashtext(p_room_id::text || ':1'))::int,
    phase_ends_at = now() + interval '60 seconds'
  where id = p_room_id;

  perform public.party_log_event(
    p_room_id,
    'game_started'::text,
    'caption'::text,
    1::smallint,
    jsonb_build_object('round_count', v_room.round_count)
  );
  perform public.party_log_event(
    p_room_id,
    'phase_entered'::text,
    'caption'::text,
    1::smallint
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.party_create_room(smallint, smallint) from public;
grant execute on function public.party_create_room(smallint, smallint) to authenticated;

revoke all on function public.party_start_game(uuid) from public;
grant execute on function public.party_start_game(uuid) to authenticated;
