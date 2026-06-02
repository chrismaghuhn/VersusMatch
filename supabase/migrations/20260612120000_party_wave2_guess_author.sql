-- Party Wave 2 Task 1 (1a-1e): author-guess phase + schema/RPC updates

-- ---------------------------------------------------------------------------
-- 1a) Schema + phase CHECK
-- ---------------------------------------------------------------------------

alter table public.party_rooms
  drop constraint if exists party_rooms_phase_check;

alter table public.party_rooms
  add constraint party_rooms_phase_check
  check (phase in ('waiting', 'caption', 'voting', 'guess', 'reveal', 'finished'));

alter table public.party_rooms
  add column if not exists author_guess_enabled boolean not null default true,
  add column if not exists author_guesses_count smallint not null default 0,
  add column if not exists author_guess_awarded_at timestamptz,
  add column if not exists round_winner_submission_id uuid references public.party_submissions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 1b) party_author_guesses + RLS
-- ---------------------------------------------------------------------------

create table if not exists public.party_author_guesses (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  round smallint not null,
  voter_id uuid not null references auth.users (id) on delete cascade,
  guessed_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, round, voter_id)
);

alter table public.party_author_guesses enable row level security;

drop policy if exists "party_author_guesses_select" on public.party_author_guesses;
create policy "party_author_guesses_select" on public.party_author_guesses
for select
to authenticated
using (
  public.party_is_member(room_id)
  and (
    (
      voter_id = auth.uid()
      and exists (
        select 1
        from public.party_rooms pr
        where pr.id = party_author_guesses.room_id
          and pr.phase = 'guess'
      )
    )
    or exists (
      select 1
      from public.party_rooms pr
      where pr.id = party_author_guesses.room_id
        and pr.phase in ('reveal', 'finished')
    )
  )
);

-- ---------------------------------------------------------------------------
-- 1c) party_submit_author_guess
-- ---------------------------------------------------------------------------

create or replace function public.party_submit_author_guess(
  p_room_id uuid,
  p_guessed_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_winner_submission public.party_submissions%rowtype;
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

  if not exists (
    select 1
    from public.party_players pp
    where pp.room_id = p_room_id
      and pp.user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if v_room.phase <> 'guess' or not v_room.author_guess_enabled then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if v_room.round_winner_submission_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_ready');
  end if;

  select * into v_winner_submission
  from public.party_submissions ps
  where ps.id = v_room.round_winner_submission_id
    and ps.room_id = p_room_id
    and ps.round = v_room.current_round;

  if v_winner_submission.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_ready');
  end if;

  if v_winner_submission.user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_eligible');
  end if;

  if exists (
    select 1
    from public.party_author_guesses pag
    where pag.room_id = p_room_id
      and pag.round = v_room.current_round
      and pag.voter_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_guessed');
  end if;

  if p_guessed_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_guess');
  end if;

  if not exists (
    select 1
    from public.party_players pp
    where pp.room_id = p_room_id
      and pp.user_id = p_guessed_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_guess');
  end if;

  insert into public.party_author_guesses (room_id, round, voter_id, guessed_user_id)
  values (p_room_id, v_room.current_round, v_uid, p_guessed_user_id);

  update public.party_rooms
  set author_guesses_count = author_guesses_count + 1
  where id = p_room_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 1d) party_advance_phase (full body)
-- ---------------------------------------------------------------------------

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

    update public.party_players pp set score = pp.score + sub.cnt
    from (
      select ps.user_id, coalesce(prr.vote_count, 0) as cnt
      from public.party_submissions ps
      left join public.party_round_results prr
        on prr.submission_id = ps.id and prr.room_id = ps.room_id and prr.round = ps.round
      where ps.room_id = p_room_id and ps.round = v_room.current_round
    ) sub
    where pp.room_id = p_room_id and pp.user_id = sub.user_id;

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

-- ---------------------------------------------------------------------------
-- 1e) party_create_room, party_rematch, party_get_recap
-- ---------------------------------------------------------------------------

drop function if exists public.party_create_room(smallint);
drop function if exists public.party_create_room(smallint, smallint);
drop function if exists public.party_create_room(smallint, smallint, boolean);
drop function if exists public.party_create_room(smallint, smallint, boolean, boolean);

create or replace function public.party_create_room(
  p_round_count smallint default 5,
  p_rerolls_per_player smallint default 0,
  p_canvas_editor_enabled boolean default false,
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
  v_canvas boolean := coalesce(p_canvas_editor_enabled, false);
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
        round_modifiers_enabled,
        author_guess_enabled
      )
      values (
        v_code,
        v_uid,
        p_round_count,
        p_rerolls_per_player,
        v_canvas,
        case when v_canvas then 90 else 60 end,
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
    0::smallint,
    jsonb_build_object(
      'round_count', p_round_count,
      'rerolls_per_player', p_rerolls_per_player,
      'canvas_editor_enabled', v_canvas,
      'round_modifiers_enabled', v_modifiers,
      'author_guess_enabled', v_author_guess
    )
  );

  return jsonb_build_object('ok', true, 'room_id', v_room_id, 'code', v_code);
end;
$$;

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
  delete from public.party_author_guesses where room_id = p_room_id;

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
    author_guesses_count = 0,
    author_guess_awarded_at = null,
    round_winner_submission_id = null,
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
  order by prr.vote_count desc, prr.submission_id asc
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.party_advance_phase(uuid) from public;
grant execute on function public.party_advance_phase(uuid) to authenticated;

revoke all on function public.party_create_room(smallint, smallint, boolean, boolean, boolean) from public;
grant execute on function public.party_create_room(smallint, smallint, boolean, boolean, boolean) to authenticated;

revoke all on function public.party_rematch(uuid) from public;
grant execute on function public.party_rematch(uuid) to authenticated;

revoke all on function public.party_submit_author_guess(uuid, uuid) from public;
grant execute on function public.party_submit_author_guess(uuid, uuid) to authenticated;

revoke all on function public.party_get_recap(text) from public;
grant execute on function public.party_get_recap(text) to anon, authenticated;
