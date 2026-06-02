-- Board Brawl schema (bb_* tables, RLS, Realtime)

create table public.bb_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'finished', 'abandoned')),
  phase text not null default 'waiting'
    check (phase in ('waiting', 'board_turn', 'board_resolve', 'minigame', 'minigame_results', 'round_end', 'finished')),
  round_count smallint not null default 5 check (round_count in (3, 5, 7)),
  current_round smallint not null default 0,
  board_seed int not null default 0,
  turn_order uuid[] not null default '{}',
  turn_index smallint not null default 0,
  active_player_id uuid references auth.users (id),
  last_roll smallint,
  pending_action text check (pending_action in ('take_turn', 'shop', 'item_target') or pending_action is null),
  minigame_id text,
  minigame_state jsonb,
  minigame_pending_inputs jsonb not null default '[]'::jsonb,
  last_tick_at timestamptz,
  phase_ends_at timestamptz,
  turn_nonce text,
  created_at timestamptz not null default now()
);

create index bb_rooms_code_idx on public.bb_rooms (code);
create index bb_rooms_status_idx on public.bb_rooms (status);

create table public.bb_players (
  room_id uuid not null references public.bb_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  coins int not null default 0 check (coins >= 0),
  stars int not null default 0 check (stars >= 0 and stars <= 3),
  position smallint not null default 0 check (position >= 0 and position < 24),
  items jsonb not null default '[]'::jsonb,
  avatar_id text not null default 'frog',
  ready boolean not null default false,
  is_host boolean not null default false,
  minigame_first_places int not null default 0,
  last_seen_at timestamptz not null default now(),
  disconnected_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create or replace function public.bb_is_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bb_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

alter table public.bb_rooms enable row level security;
alter table public.bb_players enable row level security;

create policy "bb_rooms member read"
  on public.bb_rooms for select to authenticated
  using (public.bb_is_member(id));

create policy "bb_players member read"
  on public.bb_players for select to authenticated
  using (public.bb_is_member(room_id));

-- Realtime
alter publication supabase_realtime add table public.bb_rooms;
alter publication supabase_realtime add table public.bb_players;

-- Reuse party code generator
create or replace function public.bb_generate_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
begin
  return public.party_generate_code();
end;
$$;

grant execute on function public.bb_generate_code() to authenticated;
grant execute on function public.bb_is_member(uuid) to authenticated;
