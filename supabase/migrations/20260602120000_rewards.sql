-- seasons
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

-- user_progress
create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_rewarded_vote_date date,
  underdog_count integer not null default 0 check (underdog_count >= 0),
  season_vote_count integer not null default 0 check (season_vote_count >= 0),
  primary key (user_id, season_id)
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create table public.reward_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_id uuid not null references public.votes(id) on delete cascade,
  xp_awarded integer not null check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (vote_id)
);

create table public.featured_battles (
  battle_id uuid not null references public.battles(id) on delete cascade,
  featured_date date not null,
  primary key (featured_date)
);

create index reward_grants_user_id_idx on public.reward_grants (user_id);
create index votes_ip_hash_created_at_idx on public.votes (ip_hash, created_at desc);

-- Snapshot side % at vote time (for drama + claim without extra queries)
alter table public.votes
  add column if not exists user_side_pct integer
  check (user_side_pct is null or (user_side_pct >= 0 and user_side_pct <= 100));

alter table public.seasons enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_badges enable row level security;
alter table public.reward_grants enable row level security;
alter table public.featured_battles enable row level security;

create policy "seasons_public_read" on public.seasons for select to anon, authenticated using (true);
create policy "featured_public_read" on public.featured_battles for select to anon, authenticated using (true);
create policy "user_progress_own" on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_badges_own" on public.user_badges for select to authenticated using (auth.uid() = user_id);
create policy "reward_grants_own" on public.reward_grants for select to authenticated using (auth.uid() = user_id);

insert into public.seasons (name, starts_at, ends_at)
values (
  'Season 1 — June Fights',
  '2026-06-01T00:00:00Z',
  '2026-06-29T23:59:59Z'
);
