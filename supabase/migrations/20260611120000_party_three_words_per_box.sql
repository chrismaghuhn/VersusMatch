-- Fix three_words modifier: validate each caption box (newline-separated) independently.
-- Meme templates use multiple text boxes; a global 3-word cap blocked normal captions.

create or replace function public.party_validate_round_modifier(p_modifier text, p_plain text)
returns text
language plpgsql
immutable
as $$
declare
  v_plain text := coalesce(p_plain, '');
  v_line text;
begin
  if p_modifier is null then
    return null;
  end if;

  if p_modifier = 'three_words' then
    for v_line in
      select trim(line)
      from regexp_split_to_table(v_plain, E'\n') as line
    loop
      if v_line = '' then
        continue;
      end if;
      if (
        select count(*)
        from regexp_split_to_table(v_line, '\s+') w
        where w <> ''
      ) > 3 then
        return 'modifier_violation';
      end if;
    end loop;
    return null;
  end if;

  if p_modifier = 'forty_chars' then
    if char_length(trim(v_plain)) > 40 then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  if p_modifier = 'all_caps' then
    if trim(v_plain) <> upper(trim(v_plain)) then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  return null;
end;
$$;

-- Do not advance to voting with zero submissions (timer would show an empty ballot).
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
