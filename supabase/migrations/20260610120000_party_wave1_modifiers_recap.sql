-- Party Wave 1: round modifiers + public recap

alter table public.party_rooms
  add column if not exists round_modifiers_enabled boolean not null default false,
  add column if not exists current_modifier text
    check (current_modifier is null or current_modifier in ('three_words', 'forty_chars', 'all_caps'));

create or replace function public.party_validate_round_modifier(p_modifier text, p_plain text)
returns text
language plpgsql
immutable
as $$
declare
  v_plain text := trim(coalesce(p_plain, ''));
  v_words int;
begin
  if p_modifier is null then
    return null;
  end if;

  if p_modifier = 'three_words' then
    select count(*) into v_words
    from regexp_split_to_table(v_plain, '\s+') w
    where w <> '';
    if v_words > 3 then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  if p_modifier = 'forty_chars' then
    if char_length(v_plain) > 40 then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  if p_modifier = 'all_caps' then
    if v_plain <> upper(v_plain) then
      return 'modifier_violation';
    end if;
    return null;
  end if;

  return null;
end;
$$;

create or replace function public.party_pick_round_modifier()
returns text
language sql
volatile
as $$
  select (array['three_words', 'forty_chars', 'all_caps'])[1 + floor(random() * 3)::int];
$$;

create or replace function public.party_get_recap(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_winners jsonb;
  v_round_winner jsonb;
begin
  select * into v_room from public.party_rooms where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status <> 'finished' or v_room.phase <> 'finished' then
    return jsonb_build_object('ok', false, 'error', 'not_finished');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', pr.handle,
    'score', pp.score,
    'avatarUrl', pr.avatar_url
  ) order by pp.score desc), '[]'::jsonb)
  into v_winners
  from public.party_players pp
  join public.profiles pr on pr.user_id = pp.user_id
  where pp.room_id = v_room.id
    and pp.score = (select max(score) from public.party_players where room_id = v_room.id)
    and pp.score > 0;

  select jsonb_build_object(
    'handle', pr.handle,
    'caption', ps.caption,
    'captionRich', ps.caption_rich,
    'voteCount', prr.vote_count,
    'templateId', ps.template_id
  )
  into v_round_winner
  from public.party_round_results prr
  join public.party_submissions ps on ps.id = prr.submission_id
  join public.profiles pr on pr.user_id = ps.user_id
  where prr.room_id = v_room.id
  order by prr.vote_count desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'roomCode', v_room.code,
    'roundCount', v_room.round_count,
    'gameWinners', v_winners,
    'roundWinner', v_round_winner
  );
end;
$$;

revoke all on function public.party_get_recap(text) from public;
grant execute on function public.party_get_recap(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Patched RPCs (full bodies; round modifiers wired into lifecycle + submit)
-- ---------------------------------------------------------------------------

-- party_create_room: add p_round_modifiers_enabled; drop old 3-arg overload
drop function if exists public.party_create_room(smallint, smallint, boolean);

create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 0,
  p_canvas_editor_enabled boolean default false,
  p_round_modifiers_enabled boolean default false
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
  v_canvas boolean := coalesce(p_canvas_editor_enabled, false);
  v_modifiers boolean := coalesce(p_round_modifiers_enabled, false);
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
      insert into public.party_rooms (
        code,
        host_id,
        round_count,
        rerolls_per_player,
        canvas_editor_enabled,
        caption_duration_seconds,
        round_modifiers_enabled
      )
      values (
        v_code,
        v_uid,
        p_round_count,
        p_rerolls_per_player,
        v_canvas,
        case when v_canvas then 90 else 60 end,
        v_modifiers
      )
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
      'rerolls_per_player', p_rerolls_per_player,
      'canvas_editor_enabled', v_canvas,
      'round_modifiers_enabled', v_modifiers
    )
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

-- party_start_game: pick modifier when entering round 1 caption phase
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
    current_modifier = case
      when round_modifiers_enabled then public.party_pick_round_modifier()
      else null
    end,
    phase_seed = (hashtext(p_room_id::text || ':1'))::int,
    phase_ends_at = now() + (v_room.caption_duration_seconds * interval '1 second')
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

-- party_advance_phase: pick modifier on reveal -> next caption transition
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

-- party_submit_caption: enforce active round modifier on plain text (all paths)
create or replace function public.party_submit_caption(
  p_room_id uuid,
  p_caption text,
  p_caption_rich jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_caption text;
  v_plain text;
  v_submission_id uuid;
  v_template_id uuid;
  v_box_count int;
  v_layout_revision smallint;
  v_validation_error text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.phase <> 'caption' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if exists (
    select 1 from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_submitted');
  end if;

  select template_id, layout_revision
  into v_template_id, v_layout_revision
  from public.party_player_rounds
  where room_id = p_room_id
    and round = v_room.current_round
    and user_id = v_uid;

  if v_template_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_template');
  end if;

  select jsonb_array_length(t.text_boxes) into v_box_count
  from public.party_templates t
  where t.id = v_template_id;

  if v_room.canvas_editor_enabled then
    if p_caption_rich is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if coalesce((p_caption_rich->>'v')::int, 0) <> 3 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if (p_caption_rich->>'layoutRevision')::int is distinct from v_layout_revision::int then
      return jsonb_build_object('ok', false, 'error', 'stale_revision');
    end if;

    v_validation_error := public.party_validate_caption_v3_submit(p_caption_rich, v_box_count);
    if v_validation_error is not null then
      return jsonb_build_object('ok', false, 'error', v_validation_error);
    end if;

    v_plain := public.party_caption_plain_from_rich(p_caption_rich);

    if p_caption is distinct from v_plain then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if char_length(v_plain) < 1 or char_length(v_plain) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_plain) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    v_validation_error := public.party_validate_round_modifier(v_room.current_modifier, v_plain);
    if v_validation_error is not null then
      return jsonb_build_object(
        'ok', false,
        'error', v_validation_error,
        'modifier', v_room.current_modifier
      );
    end if;

    v_caption := v_plain;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      p_caption_rich,
      v_template_id
    )
    returning id into v_submission_id;

    update public.party_player_rounds
    set caption_draft = null
    where room_id = p_room_id
      and round = v_room.current_round
      and user_id = v_uid;
  elsif p_caption_rich is not null then
    if coalesce((p_caption_rich->>'v')::int, 0) <> 2 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if jsonb_typeof(p_caption_rich->'boxes') <> 'array'
      or jsonb_array_length(p_caption_rich->'boxes') <> v_box_count then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    v_plain := public.party_caption_plain_from_rich(p_caption_rich);

    if p_caption is distinct from v_plain then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if char_length(v_plain) < 1 or char_length(v_plain) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_plain) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    v_validation_error := public.party_validate_round_modifier(v_room.current_modifier, v_plain);
    if v_validation_error is not null then
      return jsonb_build_object(
        'ok', false,
        'error', v_validation_error,
        'modifier', v_room.current_modifier
      );
    end if;

    v_caption := v_plain;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      p_caption_rich,
      v_template_id
    )
    returning id into v_submission_id;
  else
    if v_box_count >= 3 then
      return jsonb_build_object('ok', false, 'error', 'caption_rich_required');
    end if;

    v_caption := trim(p_caption);
    v_plain := v_caption;

    if char_length(v_caption) < 1 or char_length(v_caption) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_plain) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    v_validation_error := public.party_validate_round_modifier(v_room.current_modifier, v_plain);
    if v_validation_error is not null then
      return jsonb_build_object(
        'ok', false,
        'error', v_validation_error,
        'modifier', v_room.current_modifier
      );
    end if;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      null,
      v_template_id
    )
    returning id into v_submission_id;
  end if;

  update public.party_rooms set caption_count = caption_count + 1 where id = p_room_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

-- party_rematch: reset round modifier alongside Wave 1 cleanup
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
    current_modifier = null,
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

-- Grants for re-created RPCs
revoke all on function public.party_create_room(smallint, smallint, boolean, boolean) from public;
grant execute on function public.party_create_room(smallint, smallint, boolean, boolean) to authenticated;

revoke all on function public.party_start_game(uuid) from public;
grant execute on function public.party_start_game(uuid) to authenticated;

revoke all on function public.party_advance_phase(uuid) from public;
grant execute on function public.party_advance_phase(uuid) to authenticated;

revoke all on function public.party_submit_caption(uuid, text, jsonb) from public;
grant execute on function public.party_submit_caption(uuid, text, jsonb) to authenticated;

revoke all on function public.party_rematch(uuid) from public;
grant execute on function public.party_rematch(uuid) to authenticated;
