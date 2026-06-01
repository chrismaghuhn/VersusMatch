create or replace function public.party_leave_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_remaining int;
  v_new_host uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if not exists (
    select 1 from public.party_players where room_id = p_room_id and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.party_players where room_id = p_room_id and user_id = v_uid;

  select count(*) into v_remaining from public.party_players where room_id = p_room_id;

  if v_remaining = 0 then
    update public.party_rooms
    set status = 'abandoned', phase = 'finished', phase_ends_at = null
    where id = p_room_id;
    return jsonb_build_object('ok', true, 'room_abandoned', true);
  end if;

  if v_room.host_id = v_uid then
    select user_id into v_new_host
    from public.party_players
    where room_id = p_room_id
    order by joined_at asc
    limit 1;

    if v_new_host is not null then
      update public.party_players set is_host = false where room_id = p_room_id;
      update public.party_players set is_host = true where room_id = p_room_id and user_id = v_new_host;
      update public.party_rooms set host_id = v_new_host where id = p_room_id;
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.party_leave_room(uuid) from public;
grant execute on function public.party_leave_room(uuid) to authenticated;
