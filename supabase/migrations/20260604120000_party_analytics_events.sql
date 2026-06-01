-- P1.9: Party analytics funnel (server-side events, no client tracking)

create table public.party_analytics_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  event_type text not null,
  phase text,
  round smallint,
  player_count smallint,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index party_analytics_events_created_at_idx
  on public.party_analytics_events (created_at desc);

create index party_analytics_events_event_type_idx
  on public.party_analytics_events (event_type, created_at desc);

create index party_analytics_events_room_id_idx
  on public.party_analytics_events (room_id);

alter table public.party_analytics_events enable row level security;

revoke all on table public.party_analytics_events from anon, authenticated;

create or replace function public.party_log_event(
  p_room_id uuid,
  p_event_type text,
  p_phase text default null,
  p_round smallint default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count smallint;
begin
  select count(*)::smallint into v_count
  from public.party_players
  where room_id = p_room_id;

  insert into public.party_analytics_events (
    room_id,
    event_type,
    phase,
    round,
    player_count,
    meta
  )
  values (
    p_room_id,
    p_event_type,
    p_phase,
    p_round,
    v_count,
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.party_log_event(uuid, text, text, smallint, jsonb) from public;

-- party_create_room: log room_created
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

  perform public.party_log_event(
    v_room_id,
    'room_created',
    'waiting',
    0,
    jsonb_build_object('round_count', p_round_count)
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

-- party_join_room: log player_joined on new member
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

  perform public.party_log_event(v_room.id, 'player_joined', 'waiting', 0);

  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end;
$$;

-- party_start_game (min 2 players): log game_started + phase_entered
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
  if v_players < 2 then
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

-- party_advance_phase: log phase transitions + game_finished
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
    v_template := public.party_pick_template(p_room_id);
    update public.party_rooms set
      current_round = v_next_round,
      phase = 'caption',
      template_id = v_template,
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

-- party_leave_room: log player_left + room_abandoned when empty
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

  perform public.party_log_event(p_room_id, 'player_left', v_room.phase, v_room.current_round);

  select count(*) into v_remaining from public.party_players where room_id = p_room_id;

  if v_remaining = 0 then
    perform public.party_log_event(
      p_room_id,
      'room_abandoned',
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

-- party_advance_stale_rooms: log abandons for stale open lobbies
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
      'room_abandoned',
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

-- Aggregate views (service-role / SQL only)
create or replace view public.party_funnel_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type = 'room_created') as rooms_created,
  count(*) filter (where event_type = 'game_started') as games_started,
  count(*) filter (where event_type = 'game_finished') as games_finished,
  count(*) filter (where event_type = 'room_abandoned') as rooms_abandoned,
  count(*) filter (where event_type = 'player_joined') as player_joins
from public.party_analytics_events
group by 1
order by 1 desc;

create or replace view public.party_dropoff_by_phase as
select
  coalesce(meta->>'last_phase', phase, 'unknown') as last_phase,
  count(*) as abandon_count
from public.party_analytics_events
where event_type = 'room_abandoned'
group by 1
order by abandon_count desc;

create or replace view public.party_rounds_completion as
select
  event_type,
  round(avg(coalesce(round, 0))::numeric, 2) as avg_round,
  count(*) as event_count
from public.party_analytics_events
where event_type in ('game_finished', 'room_abandoned')
group by event_type;

revoke all on public.party_funnel_daily from anon, authenticated;
revoke all on public.party_dropoff_by_phase from anon, authenticated;
revoke all on public.party_rounds_completion from anon, authenticated;

grant select on public.party_funnel_daily to service_role;
grant select on public.party_dropoff_by_phase to service_role;
grant select on public.party_rounds_completion to service_role;
