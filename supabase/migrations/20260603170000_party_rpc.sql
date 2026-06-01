-- P1: Party RPCs + pg_cron stale-room advance

create or replace function public.party_generate_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_result text := '';
  v_i int;
begin
  for v_i in 1..6 loop
    v_result := v_result || substr(v_chars, (floor(random() * 32)::int + 1), 1);
  end loop;
  return v_result;
end;
$$;

create or replace function public.party_migrate_host_if_stale(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_stale timestamptz;
  v_new_host uuid;
begin
  select host_id into v_host_id from public.party_rooms where id = p_room_id;
  if v_host_id is null then
    return;
  end if;

  select last_seen_at into v_stale
  from public.party_players
  where room_id = p_room_id and user_id = v_host_id;

  if v_stale is null or v_stale >= now() - interval '60 seconds' then
    return;
  end if;

  select user_id into v_new_host
  from public.party_players
  where room_id = p_room_id and user_id <> v_host_id
  order by joined_at asc
  limit 1;

  if v_new_host is null then
    return;
  end if;

  update public.party_players set is_host = false where room_id = p_room_id;
  update public.party_players set is_host = true where room_id = p_room_id and user_id = v_new_host;
  update public.party_rooms set host_id = v_new_host where id = p_room_id;
end;
$$;

create or replace function public.party_pick_template(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used uuid[];
  v_id uuid;
begin
  select used_template_ids into v_used from public.party_rooms where id = p_room_id;

  select id into v_id
  from public.party_templates
  where active = true and not (id = any (coalesce(v_used, '{}')))
  order by random()
  limit 1;

  if v_id is null then
    update public.party_rooms set used_template_ids = '{}' where id = p_room_id;
    select id into v_id from public.party_templates where active = true order by random() limit 1;
  end if;

  if v_id is not null then
    update public.party_rooms
    set used_template_ids = array_append(coalesce(used_template_ids, '{}'), v_id)
    where id = p_room_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.party_create_room(p_round_count smallint default 5)
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

  loop
    v_attempts := v_attempts + 1;
    v_code := public.party_generate_code();
    begin
      insert into public.party_rooms (code, host_id, round_count)
      values (v_code, v_uid, p_round_count)
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

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
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

  if exists (select 1 from public.party_players where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('ok', true, 'room_id', v_room.id);
  end if;

  select count(*) into v_count from public.party_players where room_id = v_room.id;
  if v_count >= 8 then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;

  insert into public.party_players (room_id, user_id, is_host)
  values (v_room.id, v_uid, false);

  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end;
$$;

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
  if v_room.id is null or v_room.phase <> 'waiting' then
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
  v_template uuid;
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
  if v_players < 3 then
    return jsonb_build_object('ok', false, 'error', 'not_enough_players');
  end if;

  delete from public.party_reactions where room_id = p_room_id;

  v_template := public.party_pick_template(p_room_id);

  update public.party_rooms set
    status = 'in_progress',
    current_round = 1,
    phase = 'caption',
    template_id = v_template,
    caption_count = 0,
    votes_cast_count = 0,
    phase_seed = (hashtext(p_room_id::text || ':1'))::int,
    phase_ends_at = now() + interval '60 seconds'
  where id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.party_heartbeat(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  update public.party_players
  set last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

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
  v_players int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if char_length(v_caption) < 1 or char_length(v_caption) > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_caption');
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

  insert into public.party_submissions (room_id, round, user_id, caption)
  values (p_room_id, v_room.current_round, v_uid, v_caption)
  returning id into v_submission_id;

  update public.party_rooms set caption_count = caption_count + 1 where id = p_room_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

create or replace function public.party_cast_vote(p_room_id uuid, p_submission_id uuid)
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

  if v_room.phase <> 'voting' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (
    select 1 from public.party_submissions
    where id = p_submission_id and room_id = p_room_id and round = v_room.current_round
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_submission');
  end if;

  if exists (
    select 1 from public.party_votes
    where room_id = p_room_id and round = v_room.current_round and voter_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_voted');
  end if;

  insert into public.party_votes (room_id, round, voter_id, submission_id)
  values (p_room_id, v_room.current_round, v_uid, p_submission_id);

  update public.party_rooms set votes_cast_count = votes_cast_count + 1 where id = p_room_id;

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
  v_template uuid;
  v_can_advance boolean := false;
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
    return jsonb_build_object('ok', true, 'phase', 'reveal');
  end if;

  if v_room.phase = 'reveal' then
    if v_room.phase_ends_at > now() then
      return jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;

    if v_room.current_round >= v_room.round_count then
      update public.party_rooms set phase = 'finished', status = 'finished', phase_ends_at = null
      where id = p_room_id;
      return jsonb_build_object('ok', true, 'phase', 'finished');
    end if;

    v_template := public.party_pick_template(p_room_id);
    update public.party_rooms set
      current_round = v_room.current_round + 1,
      phase = 'caption',
      template_id = v_template,
      caption_count = 0,
      votes_cast_count = 0,
      phase_seed = (hashtext(p_room_id::text || ':' || (v_room.current_round + 1)::text))::int,
      phase_ends_at = now() + interval '60 seconds'
    where id = p_room_id;
    return jsonb_build_object('ok', true, 'phase', 'caption');
  end if;

  return jsonb_build_object('ok', false, 'error', 'wrong_phase');
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

  update public.party_rooms set status = 'abandoned'
  where status = 'open'
    and phase = 'waiting'
    and created_at < now() - interval '24 hours'
    and not exists (
      select 1 from public.party_players pp
      where pp.room_id = party_rooms.id and pp.last_seen_at > now() - interval '24 hours'
    );
end;
$$;

revoke all on function public.party_create_room(smallint) from public;
grant execute on function public.party_create_room(smallint) to authenticated;
revoke all on function public.party_join_room(text) from public;
grant execute on function public.party_join_room(text) to authenticated;
revoke all on function public.party_send_reaction(uuid, text) from public;
grant execute on function public.party_send_reaction(uuid, text) to authenticated;
revoke all on function public.party_start_game(uuid) from public;
grant execute on function public.party_start_game(uuid) to authenticated;
revoke all on function public.party_heartbeat(uuid) from public;
grant execute on function public.party_heartbeat(uuid) to authenticated;
revoke all on function public.party_submit_caption(uuid, text) from public;
grant execute on function public.party_submit_caption(uuid, text) to authenticated;
revoke all on function public.party_cast_vote(uuid, uuid) from public;
grant execute on function public.party_cast_vote(uuid, uuid) to authenticated;
revoke all on function public.party_advance_phase(uuid) from public;
grant execute on function public.party_advance_phase(uuid) to authenticated;

-- pg_cron: advance stale rooms every 15 seconds (enable pg_cron in Supabase dashboard if needed)
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'party-advance-stale-rooms';

    perform cron.schedule(
      'party-advance-stale-rooms',
      '15 seconds',
      $$select public.party_advance_stale_rooms();$$
    );
  end if;
exception
  when undefined_table or undefined_function then
    null;
end;
$cron$;
