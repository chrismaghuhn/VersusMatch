create or replace function public.party_retract_caption(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_deleted int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.phase <> 'caption' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  delete from public.party_submissions
  where room_id = p_room_id and round = v_room.current_round and user_id = v_uid;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_submitted');
  end if;

  update public.party_rooms
  set caption_count = greatest(0, caption_count - 1)
  where id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.party_retract_vote(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_deleted int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.phase <> 'voting' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  delete from public.party_votes
  where room_id = p_room_id and round = v_room.current_round and voter_id = v_uid;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_voted');
  end if;

  update public.party_rooms
  set votes_cast_count = greatest(0, votes_cast_count - 1)
  where id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.party_retract_caption(uuid) from public;
grant execute on function public.party_retract_caption(uuid) to authenticated;

revoke all on function public.party_retract_vote(uuid) from public;
grant execute on function public.party_retract_vote(uuid) to authenticated;
