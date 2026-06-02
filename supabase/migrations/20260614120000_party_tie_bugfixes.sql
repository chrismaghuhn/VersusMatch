-- Party tie bugfixes: defer vote scores until after tie, skip 0-vote tie, cron advance tie/guess

create or replace function public.party_apply_round_vote_scores(p_room_id uuid, p_round smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.party_players pp set score = pp.score + sub.cnt
  from (
    select ps.user_id, coalesce(prr.vote_count, 0) as cnt
    from public.party_submissions ps
    left join public.party_round_results prr
      on prr.submission_id = ps.id
      and prr.room_id = ps.room_id
      and prr.round = ps.round
    where ps.room_id = p_room_id and ps.round = p_round
  ) sub
  where pp.room_id = p_room_id and pp.user_id = sub.user_id;
end;
$$;

revoke all on function public.party_apply_round_vote_scores(uuid, smallint) from public;

create or replace function public.party_advance_phase(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_players int;
  v_submissions int;
  v_can_advance boolean := false;
  v_next_round smallint;
  v_winner_submission_id uuid;
  v_eligible int;
  v_tie_at_top int;
  v_top_votes int;
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
    select count(*) into v_submissions
    from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round;

    if v_submissions = 0 then
      if v_room.phase_ends_at <= now() then
        update public.party_rooms set
          phase_ends_at = now() + interval '30 seconds'
        where id = p_room_id;
      end if;
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

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

    select count(*) into v_submissions
    from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round;

    select prr.submission_id
    into v_winner_submission_id
    from public.party_round_results prr
    where prr.room_id = p_room_id
      and prr.round = v_room.current_round
    order by prr.vote_count desc, prr.submission_id asc
    limit 1;

    select coalesce(max(prr.vote_count), 0)
    into v_top_votes
    from public.party_round_results prr
    where prr.room_id = p_room_id
      and prr.round = v_room.current_round;

    select count(*) into v_tie_at_top
    from public.party_round_results prr
    where prr.room_id = p_room_id
      and prr.round = v_room.current_round
      and prr.vote_count = v_top_votes;

    if v_tie_at_top >= 2 and v_top_votes > 0 then
      update public.party_rooms set
        phase = 'tie',
        phase_ends_at = now() + interval '3 seconds',
        round_winner_submission_id = v_winner_submission_id
      where id = p_room_id;
      perform public.party_log_event(
        p_room_id,
        'phase_entered'::text,
        'tie'::text,
        v_room.current_round
      );
      return jsonb_build_object('ok', true, 'phase', 'tie');
    end if;

    perform public.party_apply_round_vote_scores(p_room_id, v_room.current_round);

    if v_room.author_guess_enabled and v_submissions >= 2 and v_winner_submission_id is not null then
      update public.party_rooms set
        phase = 'guess',
        phase_ends_at = now() + interval '10 seconds',
        author_guesses_count = 0,
        author_guess_awarded_at = null,
        round_winner_submission_id = v_winner_submission_id
      where id = p_room_id;
      perform public.party_log_event(
        p_room_id,
        'phase_entered'::text,
        'guess'::text,
        v_room.current_round
      );
      return jsonb_build_object('ok', true, 'phase', 'guess');
    end if;

    update public.party_rooms set
      phase = 'reveal',
      phase_ends_at = now() + interval '8 seconds',
      round_winner_submission_id = v_winner_submission_id
    where id = p_room_id;
    perform public.party_log_event(
      p_room_id,
      'phase_entered'::text,
      'reveal'::text,
      v_room.current_round
    );
    return jsonb_build_object('ok', true, 'phase', 'reveal');
  end if;

  if v_room.phase = 'tie' then
    if v_room.phase_ends_at > now() then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    select count(*) into v_submissions
    from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round;

    v_winner_submission_id := v_room.round_winner_submission_id;

    perform public.party_apply_round_vote_scores(p_room_id, v_room.current_round);

    if v_room.author_guess_enabled and v_submissions >= 2 and v_winner_submission_id is not null then
      update public.party_rooms set
        phase = 'guess',
        phase_ends_at = now() + interval '10 seconds',
        author_guesses_count = 0,
        author_guess_awarded_at = null,
        round_winner_submission_id = v_winner_submission_id
      where id = p_room_id;
      perform public.party_log_event(
        p_room_id,
        'phase_entered'::text,
        'guess'::text,
        v_room.current_round
      );
      return jsonb_build_object('ok', true, 'phase', 'guess');
    end if;

    update public.party_rooms set
      phase = 'reveal',
      phase_ends_at = now() + interval '8 seconds',
      round_winner_submission_id = v_winner_submission_id
    where id = p_room_id;
    perform public.party_log_event(
      p_room_id,
      'phase_entered'::text,
      'reveal'::text,
      v_room.current_round
    );
    return jsonb_build_object('ok', true, 'phase', 'reveal');
  end if;

  if v_room.phase = 'guess' then
    if v_room.round_winner_submission_id is null then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    select count(*)
    into v_eligible
    from public.party_players pp
    where pp.room_id = p_room_id
      and pp.user_id <> (
        select ps.user_id
        from public.party_submissions ps
        where ps.id = v_room.round_winner_submission_id
      );

    v_can_advance := v_room.phase_ends_at <= now() or v_room.author_guesses_count >= coalesce(v_eligible, 0);
    if not v_can_advance then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    if v_room.author_guess_awarded_at is null then
      update public.party_players pp
      set score = pp.score + 1
      from (
        select pag.voter_id
        from public.party_author_guesses pag
        join public.party_submissions ps
          on ps.id = v_room.round_winner_submission_id
        where pag.room_id = p_room_id
          and pag.round = v_room.current_round
          and pag.guessed_user_id = ps.user_id
      ) winners
      where pp.room_id = p_room_id
        and pp.user_id = winners.voter_id;

      update public.party_rooms
      set author_guess_awarded_at = now()
      where id = p_room_id;
    end if;

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
      author_guesses_count = 0,
      author_guess_awarded_at = null,
      round_winner_submission_id = null,
      current_modifier = case
        when round_modifiers_enabled then public.party_pick_round_modifier()
        else null
      end,
      phase_seed = (hashtext(p_room_id::text || ':' || v_next_round::text))::int,
      phase_ends_at = now() + (v_room.caption_duration_seconds * interval '1 second')
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

revoke all on function public.party_advance_phase(uuid) from public;
grant execute on function public.party_advance_phase(uuid) to authenticated;

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
      and phase in ('caption', 'voting', 'tie', 'guess', 'reveal')
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
