-- Allow starting party games with 2 players (was 3)
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
  v_template uuid;
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

  v_template := public.party_pick_template(p_room_id);

  update public.party_rooms set
    status = 'in_progress',
    current_round = 1,
    phase = 'caption',
    template_id = v_template,
    caption_count = 0,
    votes_cast_count = 0,
    phase_seed = (hashtext(p_room_id::text || ':1'))::int,
    phase_ends_at = now() + interval '60 seconds'
  where id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;
