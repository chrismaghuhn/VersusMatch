-- Return current user's vote for active round (no service role needed in snapshot API)

create or replace function public.party_get_my_vote(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_round smallint;
  v_submission_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  select current_round into v_round from public.party_rooms where id = p_room_id;
  if v_round is null or v_round = 0 then
    return jsonb_build_object('ok', true, 'submission_id', null);
  end if;

  select submission_id into v_submission_id
  from public.party_votes
  where room_id = p_room_id and round = v_round and voter_id = v_uid;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

revoke all on function public.party_get_my_vote(uuid) from public, anon;
grant execute on function public.party_get_my_vote(uuid) to authenticated;
