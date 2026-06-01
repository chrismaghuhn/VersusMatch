-- PL/pgSQL resolves integer literals as integer, not smallint. Same class of bug as
-- party_log_event: PERFORM lookup fails for party_assign_player_templates(uuid, integer).
-- Harden remaining RPCs with integer round params and explicit text casts on log events.

drop function if exists public.party_assign_player_templates(uuid, smallint);

create or replace function public.party_assign_player_templates(
  p_room_id uuid,
  p_round integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned uuid[] := '{}';
  v_player uuid;
  v_template uuid;
begin
  for v_player in
    select user_id from public.party_players
    where room_id = p_room_id
    order by joined_at
  loop
    v_template := public.party_pick_template_for_round(p_room_id, v_assigned);
    insert into public.party_player_rounds (room_id, round, user_id, template_id)
    values (p_room_id, p_round::smallint, v_player, v_template)
    on conflict (room_id, round, user_id)
    do update set template_id = excluded.template_id;
    v_assigned := array_append(v_assigned, v_template);
  end loop;
end;
$$;

revoke all on function public.party_assign_player_templates(uuid, integer) from public;

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
    1,
    jsonb_build_object('round_count', v_room.round_count)
  );
  perform public.party_log_event(
    p_room_id,
    'phase_entered'::text,
    'caption'::text,
    1
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.party_advance_phase(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_players int;
  v_can_advance boolean := false;
  v_next_round smallint;
begin
  perform public.party_migrate_host_if_stale(p_room_id);

  select * into v_room from public.party_rooms where id = p_room_id for update;
  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status = 'finished' or v_room.phase = 'waiting' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  select count(*) into v_players from public.party_players where room_id = p_room_id;

  if v_room.phase = 'caption' then
    v_can_advance := v_room.phase_ends_at <= now() or v_room.caption_count >= v_players;
    if not v_can_advance then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;
    update public.party_rooms set
      phase = 'voting',
      votes_cast_count = 0,
      phase_ends_at = now() + interval '30 seconds'
    where id = p_room_id;
    perform public.party_log_event(
      p_room_id,
      'phase_entered'::text,
      'voting'::text,
      v_room.current_round
    );
    return jsonb_build_object('ok', true, 'phase', 'voting');
  end if;

  if v_room.phase = 'voting' then
    v_can_advance := v_room.phase_ends_at <= now() or v_room.votes_cast_count >= v_players;
    if not v_can_advance then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    insert into public.party_round_results (room_id, round, submission_id, vote_count)
    select ps.room_id, ps.round, ps.id, count(pv.voter_id)::int
    from public.party_submissions ps
    left join public.party_votes pv
      on pv.submission_id = ps.id
      and pv.room_id = ps.room_id
      and pv.round = ps.round
    where ps.room_id = p_room_id and ps.round = v_room.current_round
    group by ps.room_id, ps.round, ps.id
    on conflict (room_id, round, submission_id) do update set vote_count = excluded.vote_count;

    update public.party_players pp set score = pp.score + sub.cnt
    from (
      select ps.user_id, coalesce(prr.vote_count, 0) as cnt
      from public.party_submissions ps
      left join public.party_round_results prr
        on prr.submission_id = ps.id and prr.room_id = ps.room_id and prr.round = ps.round
      where ps.room_id = p_room_id and ps.round = v_room.current_round
    ) sub
    where pp.room_id = p_room_id and pp.user_id = sub.user_id;

    update public.party_rooms set
      phase = 'reveal',
      phase_ends_at = now() + interval '8 seconds'
    where id = p_room_id;
    perform public.party_log_event(
      p_room_id,
      'phase_entered'::text,
      'reveal'::text,
      v_room.current_round
    );
    return jsonb_build_object('ok', true, 'phase', 'reveal');
  end if;

  if v_room.phase = 'reveal' then
    if v_room.phase_ends_at > now() then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    if v_room.current_round >= v_room.round_count then
      update public.party_rooms set phase = 'finished', status = 'finished', phase_ends_at = null
      where id = p_room_id;
      perform public.party_log_event(
        p_room_id,
        'game_finished'::text,
        'finished'::text,
        v_room.current_round,
        jsonb_build_object('round_count', v_room.round_count)
      );
      perform public.party_log_event(
        p_room_id,
        'phase_entered'::text,
        'finished'::text,
        v_room.current_round
      );
      return jsonb_build_object('ok', true, 'phase', 'finished');
    end if;

    v_next_round := v_room.current_round + 1;
    perform public.party_assign_player_templates(p_room_id, v_next_round);
    update public.party_rooms set
      current_round = v_next_round,
      phase = 'caption',
      caption_count = 0,
      votes_cast_count = 0,
      phase_seed = (hashtext(p_room_id::text || ':' || v_next_round::text))::int,
      phase_ends_at = now() + interval '60 seconds'
    where id = p_room_id;
    perform public.party_log_event(
      p_room_id,
      'phase_entered'::text,
      'caption'::text,
      v_next_round
    );
    return jsonb_build_object('ok', true, 'phase', 'caption');
  end if;

  return jsonb_build_object('ok', false, 'error', 'wrong_phase');
end;
$$;

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

  perform public.party_log_event(
    p_room_id,
    'player_left'::text,
    v_room.phase,
    v_room.current_round
  );

  select count(*) into v_remaining from public.party_players where room_id = p_room_id;

  if v_remaining = 0 then
    perform public.party_log_event(
      p_room_id,
      'room_abandoned'::text,
      v_room.phase,
      v_room.current_round,
      jsonb_build_object(
        'reason', 'empty',
        'last_phase', v_room.phase,
        'last_round', v_room.current_round,
        'status', v_room.status
      )
    );
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

create or replace function public.party_advance_stale_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_room public.party_rooms%rowtype;
begin
  for v_room_id in
    select id from public.party_rooms
    where status = 'in_progress'
      and phase in ('caption', 'voting', 'reveal')
      and phase_ends_at is not null
      and phase_ends_at <= now()
  loop
    perform public.party_advance_phase(v_room_id);
  end loop;

  for v_room in
    select * from public.party_rooms
    where status = 'open'
      and phase = 'waiting'
      and created_at < now() - interval '24 hours'
      and not exists (
        select 1 from public.party_players pp
        where pp.room_id = party_rooms.id and pp.last_seen_at > now() - interval '24 hours'
      )
  loop
    perform public.party_log_event(
      v_room.id,
      'room_abandoned'::text,
      v_room.phase,
      v_room.current_round,
      jsonb_build_object(
        'reason', 'stale_open',
        'last_phase', v_room.phase,
        'last_round', v_room.current_round,
        'status', v_room.status
      )
    );
    update public.party_rooms set status = 'abandoned' where id = v_room.id;
  end loop;
end;
$$;

revoke all on function public.party_start_game(uuid) from public;
grant execute on function public.party_start_game(uuid) to authenticated;

revoke all on function public.party_advance_phase(uuid) from public;
grant execute on function public.party_advance_phase(uuid) to authenticated;

revoke all on function public.party_leave_room(uuid) from public;
grant execute on function public.party_leave_room(uuid) to authenticated;
