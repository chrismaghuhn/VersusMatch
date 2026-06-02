-- Party lobby settings + host kick RPCs

alter table public.party_rooms
  add column if not exists vote_duration_seconds smallint not null default 30,
  add column if not exists max_players smallint not null default 8;

alter table public.party_rooms
  drop constraint if exists party_rooms_caption_duration_seconds_check;

alter table public.party_rooms
  drop constraint if exists party_rooms_vote_duration_seconds_check;

alter table public.party_rooms
  drop constraint if exists party_rooms_max_players_check;

alter table public.party_rooms
  add constraint party_rooms_caption_duration_seconds_check
  check (
    caption_duration_seconds >= 30
    and caption_duration_seconds <= 120
    and caption_duration_seconds % 15 = 0
  );

alter table public.party_rooms
  add constraint party_rooms_vote_duration_seconds_check
  check (vote_duration_seconds in (20, 30, 45));

alter table public.party_rooms
  add constraint party_rooms_max_players_check
  check (max_players between 2 and 8);

create table if not exists public.party_room_bans (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  banned_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  primary key (room_id, user_id)
);

alter table public.party_room_bans enable row level security;

create or replace function public.party_update_lobby_settings(
  p_room_id uuid,
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_key text;
  v_value jsonb;
  v_player_count int;
  v_round_count smallint;
  v_rerolls_per_player smallint;
  v_caption_duration_seconds smallint;
  v_vote_duration_seconds smallint;
  v_max_players smallint;
  v_canvas_editor_enabled boolean;
  v_round_modifiers_enabled boolean;
  v_author_guess_enabled boolean;
  v_effective_rounds smallint;
  v_effective_rerolls smallint;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room
  from public.party_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if v_room.phase <> 'waiting' or v_room.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if p_settings is null
    or jsonb_typeof(p_settings) <> 'object'
    or p_settings = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'invalid_settings');
  end if;

  for v_key, v_value in
    select key, value
    from jsonb_each(p_settings)
  loop
    if v_key not in (
      'round_count',
      'rerolls_per_player',
      'caption_duration_seconds',
      'vote_duration_seconds',
      'max_players',
      'canvas_editor_enabled',
      'round_modifiers_enabled',
      'author_guess_enabled'
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;

    if jsonb_typeof(v_value) = 'null' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end loop;

  if p_settings ? 'round_count' then
    if jsonb_typeof(p_settings -> 'round_count') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_round_count := (p_settings ->> 'round_count')::smallint;
    if v_round_count not in (3, 5, 7) then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end if;

  if p_settings ? 'rerolls_per_player' then
    if jsonb_typeof(p_settings -> 'rerolls_per_player') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_rerolls_per_player := (p_settings ->> 'rerolls_per_player')::smallint;
    if v_rerolls_per_player < 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end if;

  if p_settings ? 'caption_duration_seconds' then
    if jsonb_typeof(p_settings -> 'caption_duration_seconds') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_caption_duration_seconds := (p_settings ->> 'caption_duration_seconds')::smallint;
    if v_caption_duration_seconds < 30
      or v_caption_duration_seconds > 120
      or v_caption_duration_seconds % 15 <> 0 then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end if;

  if p_settings ? 'vote_duration_seconds' then
    if jsonb_typeof(p_settings -> 'vote_duration_seconds') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_vote_duration_seconds := (p_settings ->> 'vote_duration_seconds')::smallint;
    if v_vote_duration_seconds not in (20, 30, 45) then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end if;

  if p_settings ? 'max_players' then
    if jsonb_typeof(p_settings -> 'max_players') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_max_players := (p_settings ->> 'max_players')::smallint;
    if v_max_players < 2 or v_max_players > 8 then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
  end if;

  if p_settings ? 'canvas_editor_enabled' then
    if jsonb_typeof(p_settings -> 'canvas_editor_enabled') <> 'boolean' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_canvas_editor_enabled := (p_settings ->> 'canvas_editor_enabled')::boolean;
  end if;

  if p_settings ? 'round_modifiers_enabled' then
    if jsonb_typeof(p_settings -> 'round_modifiers_enabled') <> 'boolean' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_round_modifiers_enabled := (p_settings ->> 'round_modifiers_enabled')::boolean;
  end if;

  if p_settings ? 'author_guess_enabled' then
    if jsonb_typeof(p_settings -> 'author_guess_enabled') <> 'boolean' then
      return jsonb_build_object('ok', false, 'error', 'invalid_settings');
    end if;
    v_author_guess_enabled := (p_settings ->> 'author_guess_enabled')::boolean;
  end if;

  v_effective_rounds := coalesce(v_round_count, v_room.round_count);
  v_effective_rerolls := coalesce(v_rerolls_per_player, v_room.rerolls_per_player);
  if v_effective_rerolls > v_effective_rounds then
    return jsonb_build_object('ok', false, 'error', 'invalid_settings');
  end if;

  if v_max_players is not null then
    select count(*) into v_player_count
    from public.party_players
    where room_id = p_room_id;

    if v_player_count > v_max_players then
      return jsonb_build_object('ok', false, 'error', 'too_many_players');
    end if;
  end if;

  update public.party_rooms
  set
    round_count = coalesce(v_round_count, round_count),
    rerolls_per_player = coalesce(v_rerolls_per_player, rerolls_per_player),
    caption_duration_seconds = coalesce(v_caption_duration_seconds, caption_duration_seconds),
    vote_duration_seconds = coalesce(v_vote_duration_seconds, vote_duration_seconds),
    max_players = coalesce(v_max_players, max_players),
    canvas_editor_enabled = coalesce(v_canvas_editor_enabled, canvas_editor_enabled),
    round_modifiers_enabled = coalesce(v_round_modifiers_enabled, round_modifiers_enabled),
    author_guess_enabled = coalesce(v_author_guess_enabled, author_guess_enabled)
  where id = p_room_id
  returning * into v_room;

  perform public.party_log_event(
    p_room_id,
    'lobby_settings_updated'::text,
    v_room.phase,
    v_room.current_round,
    jsonb_build_object('settings', p_settings)
  );

  return jsonb_build_object(
    'ok', true,
    'room', jsonb_build_object(
      'round_count', v_room.round_count,
      'rerolls_per_player', v_room.rerolls_per_player,
      'caption_duration_seconds', v_room.caption_duration_seconds,
      'vote_duration_seconds', v_room.vote_duration_seconds,
      'max_players', v_room.max_players,
      'canvas_editor_enabled', v_room.canvas_editor_enabled,
      'round_modifiers_enabled', v_room.round_modifiers_enabled,
      'author_guess_enabled', v_room.author_guess_enabled
    )
  );
end;
$$;

create or replace function public.party_kick_player(
  p_room_id uuid,
  p_target_user_id uuid,
  p_block_rejoin boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_target_is_host boolean;
  v_player_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room
  from public.party_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_host');
  end if;

  if v_room.phase <> 'waiting' or v_room.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if p_target_user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'cannot_kick_self');
  end if;

  select count(*) into v_player_count
  from public.party_players
  where room_id = p_room_id;

  if v_player_count <= 1 then
    return jsonb_build_object('ok', false, 'error', 'cannot_kick_last');
  end if;

  select is_host into v_target_is_host
  from public.party_players
  where room_id = p_room_id
    and user_id = p_target_user_id
  for update;

  if v_target_is_host is null or v_target_is_host then
    return jsonb_build_object('ok', false, 'error', 'player_not_found');
  end if;

  delete from public.party_players
  where room_id = p_room_id
    and user_id = p_target_user_id
    and is_host = false;

  if p_block_rejoin then
    insert into public.party_room_bans (room_id, user_id, banned_by, expires_at)
    values (p_room_id, p_target_user_id, v_uid, now() + interval '24 hours')
    on conflict (room_id, user_id)
    do update set
      banned_by = excluded.banned_by,
      expires_at = excluded.expires_at;
  end if;

  perform public.party_log_event(
    p_room_id,
    'player_kicked'::text,
    v_room.phase,
    v_room.current_round,
    jsonb_build_object(
      'user_id', p_target_user_id,
      'block_rejoin', coalesce(p_block_rejoin, false)
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.party_user_was_room_member(
  p_room_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.party_analytics_events pae
    where pae.room_id = p_room_id
      and pae.event_type = 'player_joined'
      and pae.meta ->> 'user_id' = p_user_id::text
  );
$$;

create or replace function public.party_join_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;

  if v_room.status <> 'open' or v_room.phase <> 'waiting' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if exists (
    select 1
    from public.party_room_bans
    where room_id = v_room.id
      and user_id = v_uid
      and expires_at > now()
  ) then
    return jsonb_build_object('ok', false, 'error', 'banned_from_room');
  end if;

  if exists (select 1 from public.party_players where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('ok', true, 'room_id', v_room.id);
  end if;

  select count(*) into v_count from public.party_players where room_id = v_room.id;
  if v_count >= v_room.max_players then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;

  insert into public.party_players (room_id, user_id, is_host)
  values (v_room.id, v_uid, false);

  perform public.party_log_event(
    v_room.id,
    'player_joined'::text,
    'waiting'::text,
    0,
    jsonb_build_object('user_id', v_uid)
  );

  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end;
$$;

create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 2,
  p_canvas_editor_enabled boolean default true,
  p_round_modifiers_enabled boolean default false,
  p_author_guess_enabled boolean default true
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
  v_canvas boolean := coalesce(p_canvas_editor_enabled, true);
  v_modifiers boolean := coalesce(p_round_modifiers_enabled, false);
  v_author_guess boolean := coalesce(p_author_guess_enabled, true);
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
        vote_duration_seconds,
        max_players,
        round_modifiers_enabled,
        author_guess_enabled
      )
      values (
        v_code,
        v_uid,
        p_round_count,
        p_rerolls_per_player,
        v_canvas,
        90,
        30,
        8,
        v_modifiers,
        v_author_guess
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
    0,
    jsonb_build_object(
      'round_count', p_round_count,
      'rerolls_per_player', p_rerolls_per_player,
      'canvas_editor_enabled', v_canvas,
      'caption_duration_seconds', 90,
      'vote_duration_seconds', 30,
      'max_players', 8,
      'round_modifiers_enabled', v_modifiers,
      'author_guess_enabled', v_author_guess
    )
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
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
      phase_ends_at = now() + (v_room.vote_duration_seconds * interval '1 second')
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

revoke all on function public.party_update_lobby_settings(uuid, jsonb) from public;
grant execute on function public.party_update_lobby_settings(uuid, jsonb) to authenticated;

revoke all on function public.party_kick_player(uuid, uuid, boolean) from public;
grant execute on function public.party_kick_player(uuid, uuid, boolean) to authenticated;

revoke all on function public.party_user_was_room_member(uuid, uuid) from public;
grant execute on function public.party_user_was_room_member(uuid, uuid) to authenticated;
