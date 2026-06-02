-- Wave 2.5: lobby warmup polls (waiting phase only)

create table public.party_lobby_poll_votes (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  poll_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  option_index smallint not null check (option_index >= 0 and option_index < 8),
  created_at timestamptz not null default now(),
  primary key (room_id, poll_key, user_id)
);

create index party_lobby_poll_votes_room_poll_idx
  on public.party_lobby_poll_votes (room_id, poll_key);

alter table public.party_lobby_poll_votes enable row level security;

create policy party_lobby_poll_votes_select on public.party_lobby_poll_votes
  for select to authenticated
  using (public.party_is_member(room_id));

-- Writes only via RPC
revoke insert, update, delete on public.party_lobby_poll_votes from authenticated;

create or replace function public.party_cast_lobby_poll_vote(
  p_room_id uuid,
  p_option_index int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_poll_index int;
  v_poll_key text;
  v_option_count int := 3;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if not public.party_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id;

  if v_room.phase <> 'waiting' or v_room.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  v_poll_index := abs(hashtext(p_room_id::text)) % 4;
  v_poll_key := 'warmup-' || v_poll_index::text;

  if p_option_index < 0 or p_option_index >= v_option_count then
    return jsonb_build_object('ok', false, 'error', 'invalid_option');
  end if;

  insert into public.party_lobby_poll_votes (room_id, poll_key, user_id, option_index)
  values (p_room_id, v_poll_key, v_uid, p_option_index)
  on conflict (room_id, poll_key, user_id)
  do update set option_index = excluded.option_index, created_at = now();

  return jsonb_build_object('ok', true, 'poll_key', v_poll_key);
end;
$$;

revoke all on function public.party_cast_lobby_poll_vote(uuid, int) from public;
grant execute on function public.party_cast_lobby_poll_vote(uuid, int) to authenticated;

-- Clear lobby poll votes when game starts (alongside reactions)
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
  delete from public.party_lobby_poll_votes where room_id = p_room_id;

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
