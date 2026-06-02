-- Party Wave 1: rematch, reveal reactions, peek room

-- R1: party_rematch
create or replace function public.party_rematch(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_players int;
  v_prev_rounds smallint;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if v_room.phase <> 'finished' or v_room.status <> 'finished' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  select count(*) into v_players from public.party_players where room_id = p_room_id;
  if v_players < 2 then
    return jsonb_build_object('ok', false, 'error', 'not_enough_players');
  end if;

  v_prev_rounds := v_room.round_count;

  delete from public.party_votes where room_id = p_room_id;
  delete from public.party_round_results where room_id = p_room_id;
  delete from public.party_submissions where room_id = p_room_id;
  delete from public.party_reactions where room_id = p_room_id;
  delete from public.party_player_rounds where room_id = p_room_id;

  update public.party_players
  set score = 0, rerolls_used = 0
  where room_id = p_room_id;

  update public.party_rooms set
    phase = 'waiting',
    status = 'open',
    current_round = 0,
    caption_count = 0,
    votes_cast_count = 0,
    phase_ends_at = null,
    phase_seed = null,
    used_template_ids = '{}'
  where id = p_room_id;

  perform public.party_log_event(
    p_room_id,
    'rematch_started'::text,
    'waiting'::text,
    0,
    jsonb_build_object('previous_round_count', v_prev_rounds)
  );

  return jsonb_build_object('ok', true, 'phase', 'waiting');
end;
$$;

revoke all on function public.party_rematch(uuid) from public;
grant execute on function public.party_rematch(uuid) to authenticated;

-- R2: party_send_reaction — allow reveal phase
create or replace function public.party_send_reaction(p_room_id uuid, p_reaction_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_reaction_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_reaction_key not in ('laugh', 'eyes', 'fire') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reaction');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null or v_room.phase not in ('waiting', 'reveal') then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if exists (
    select 1 from public.party_players
    where room_id = p_room_id and user_id = v_uid
      and last_reaction_at is not null
      and last_reaction_at > now() - interval '2 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.party_reactions (room_id, user_id, reaction_key)
  values (p_room_id, v_uid, p_reaction_key)
  returning id into v_reaction_id;

  update public.party_players
  set last_reaction_at = now(), last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'reaction_id', v_reaction_id);
end;
$$;

-- R2: RLS — reactions visible in waiting OR reveal
drop policy if exists "party_reactions_select" on public.party_reactions;
create policy "party_reactions_select" on public.party_reactions for select to authenticated
  using (
    public.party_is_member(room_id)
    and exists (
      select 1 from public.party_rooms pr
      where pr.id = party_reactions.room_id
        and pr.phase in ('waiting', 'reveal')
    )
  );

-- V1: party_peek_room (anon-safe)
create or replace function public.party_peek_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_host_handle text;
  v_count int;
begin
  select * into v_room
  from public.party_rooms
  where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status = 'abandoned' then
    return jsonb_build_object('ok', false, 'error', 'room_closed');
  end if;

  select handle into v_host_handle
  from public.profiles
  where user_id = v_room.host_id;

  select count(*) into v_count from public.party_players where room_id = v_room.id;

  return jsonb_build_object(
    'ok', true,
    'code', v_room.code,
    'host_handle', coalesce(v_host_handle, '?'),
    'player_count', v_count,
    'max_players', 8,
    'status', v_room.status,
    'phase', case when v_room.status = 'open' and v_room.phase = 'waiting' then 'waiting' else 'in_progress' end,
    'in_game', v_room.status = 'in_progress',
    'is_finished', v_room.status = 'finished'
  );
end;
$$;

revoke all on function public.party_peek_room(text) from public;
grant execute on function public.party_peek_room(text) to anon, authenticated;
