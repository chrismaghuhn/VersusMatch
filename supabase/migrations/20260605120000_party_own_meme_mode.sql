-- P1.10: Own Meme mode — per-player templates, rerolls, submission template_id

alter table public.party_rooms
  add column if not exists rerolls_per_player smallint not null default 0;

alter table public.party_players
  add column if not exists rerolls_used smallint not null default 0;

alter table public.party_submissions
  add column if not exists template_id uuid references public.party_templates (id);

create table if not exists public.party_player_rounds (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  round smallint not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.party_templates (id),
  primary key (room_id, round, user_id)
);

alter table public.party_player_rounds enable row level security;

create policy "party_player_rounds_own_select" on public.party_player_rounds
  for select to authenticated
  using (
    public.party_is_member(room_id)
    and user_id = auth.uid()
    and exists (
      select 1 from public.party_rooms pr
      where pr.id = party_player_rounds.room_id
        and pr.phase = 'caption'
    )
  );

-- Pick template excluding round-local assignments (within-round uniqueness)
create or replace function public.party_pick_template_for_round(
  p_room_id uuid,
  p_exclude uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used uuid[];
  v_id uuid;
  v_exclude uuid[] := coalesce(p_exclude, '{}');
begin
  select used_template_ids into v_used from public.party_rooms where id = p_room_id;

  select id into v_id
  from public.party_templates
  where active = true
    and not (id = any (coalesce(v_used, '{}')))
    and not (id = any (v_exclude))
  order by random()
  limit 1;

  if v_id is null then
    update public.party_rooms set used_template_ids = '{}' where id = p_room_id;

    select id into v_id
    from public.party_templates
    where active = true
      and not (id = any (v_exclude))
    order by random()
    limit 1;
  end if;

  if v_id is null then
    select id into v_id
    from public.party_templates
    where active = true
    order by random()
    limit 1;
  end if;

  if v_id is not null then
    update public.party_rooms
    set used_template_ids = array_append(coalesce(used_template_ids, '{}'), v_id)
    where id = p_room_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.party_pick_template_for_round(uuid, uuid[]) from public;

create or replace function public.party_assign_player_templates(
  p_room_id uuid,
  p_round smallint
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
    values (p_room_id, p_round, v_player, v_template)
    on conflict (room_id, round, user_id)
    do update set template_id = excluded.template_id;
    v_assigned := array_append(v_assigned, v_template);
  end loop;
end;
$$;

revoke all on function public.party_assign_player_templates(uuid, smallint) from public;

create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 0
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
      insert into public.party_rooms (code, host_id, round_count, rerolls_per_player)
      values (v_code, v_uid, p_round_count, p_rerolls_per_player)
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
    'room_created',
    'waiting',
    0,
    jsonb_build_object(
      'round_count', p_round_count,
      'rerolls_per_player', p_rerolls_per_player
    )
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

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
    'game_started',
    'caption',
    1,
    jsonb_build_object('round_count', v_room.round_count)
  );
  perform public.party_log_event(p_room_id, 'phase_entered', 'caption', 1);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.party_submit_caption(p_room_id uuid, p_caption text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_caption text := trim(p_caption);
  v_submission_id uuid;
  v_template_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if char_length(v_caption) < 1 or char_length(v_caption) > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_caption');
  end if;

  if public.party_caption_has_profanity(v_caption) then
    return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
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

  select template_id into v_template_id
  from public.party_player_rounds
  where room_id = p_room_id
    and round = v_room.current_round
    and user_id = v_uid;

  if v_template_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_template');
  end if;

  insert into public.party_submissions (room_id, round, user_id, caption, template_id)
  values (p_room_id, v_room.current_round, v_uid, v_caption, v_template_id)
  returning id into v_submission_id;

  update public.party_rooms set caption_count = caption_count + 1 where id = p_room_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

create or replace function public.party_reroll_template(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_player public.party_players%rowtype;
  v_exclude uuid[];
  v_template uuid;
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

  select * into v_player
  from public.party_players
  where room_id = p_room_id and user_id = v_uid;

  if v_player.rerolls_used >= v_room.rerolls_per_player then
    return jsonb_build_object('ok', false, 'error', 'no_rerolls_left');
  end if;

  select coalesce(array_agg(template_id), '{}') into v_exclude
  from public.party_player_rounds
  where room_id = p_room_id and round = v_room.current_round;

  v_template := public.party_pick_template_for_round(p_room_id, v_exclude);

  update public.party_player_rounds
  set template_id = v_template
  where room_id = p_room_id
    and round = v_room.current_round
    and user_id = v_uid;

  update public.party_players
  set rerolls_used = rerolls_used + 1
  where room_id = p_room_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'template_id', v_template);
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
    perform public.party_log_event(p_room_id, 'phase_entered', 'voting', v_room.current_round);
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
    perform public.party_log_event(p_room_id, 'phase_entered', 'reveal', v_room.current_round);
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
        'game_finished',
        'finished',
        v_room.current_round,
        jsonb_build_object('round_count', v_room.round_count)
      );
      perform public.party_log_event(p_room_id, 'phase_entered', 'finished', v_room.current_round);
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
    perform public.party_log_event(p_room_id, 'phase_entered', 'caption', v_next_round);
    return jsonb_build_object('ok', true, 'phase', 'caption');
  end if;

  return jsonb_build_object('ok', false, 'error', 'wrong_phase');
end;
$$;

revoke all on function public.party_create_room(smallint) from public;
revoke all on function public.party_create_room(smallint, smallint) from public;
grant execute on function public.party_create_room(smallint, smallint) to authenticated;

revoke all on function public.party_reroll_template(uuid) from public;
grant execute on function public.party_reroll_template(uuid) to authenticated;
