-- P1: Party game schema (tables, RLS, Realtime)

create table public.party_templates (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  text_boxes jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.party_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'finished', 'abandoned')),
  round_count smallint not null default 5 check (round_count in (3, 5, 7)),
  current_round smallint not null default 0,
  phase text not null default 'waiting'
    check (phase in ('waiting', 'caption', 'voting', 'reveal', 'finished')),
  template_id uuid references public.party_templates (id),
  phase_ends_at timestamptz,
  phase_seed int,
  caption_count smallint not null default 0,
  votes_cast_count smallint not null default 0,
  used_template_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index party_rooms_phase_ends_at_idx on public.party_rooms (phase_ends_at)
  where status = 'in_progress';

create table public.party_players (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null default 0,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_reaction_at timestamptz,
  primary key (room_id, user_id)
);

create table public.party_submissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  round smallint not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text not null check (char_length(caption) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (room_id, round, user_id)
);

create table public.party_votes (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  round smallint not null,
  voter_id uuid not null references auth.users (id) on delete cascade,
  submission_id uuid not null references public.party_submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, round, voter_id)
);

create table public.party_round_results (
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  round smallint not null,
  submission_id uuid not null references public.party_submissions (id) on delete cascade,
  vote_count int not null default 0,
  primary key (room_id, round, submission_id)
);

create table public.party_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.party_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction_key text not null check (reaction_key in ('laugh', 'eyes', 'fire')),
  created_at timestamptz not null default now()
);

create index party_reactions_room_created_idx
  on public.party_reactions (room_id, created_at desc);

-- Seed placeholder templates (replace image_path when assets land in storage)
insert into public.party_templates (image_path, text_boxes, sort_order) values
  ('party-templates/placeholder-1.webp', '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb, 1),
  ('party-templates/placeholder-2.webp', '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb, 2),
  ('party-templates/placeholder-3.webp', '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb, 3);

-- RLS helper
create or replace function public.party_is_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.party_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

revoke all on function public.party_is_member(uuid) from public;
grant execute on function public.party_is_member(uuid) to authenticated;

alter table public.party_templates enable row level security;
create policy "party_templates_read" on public.party_templates for select to authenticated using (active = true);

alter table public.party_rooms enable row level security;
create policy "party_rooms_member_select" on public.party_rooms for select to authenticated
  using (public.party_is_member(id));

alter table public.party_players enable row level security;
create policy "party_players_member_select" on public.party_players for select to authenticated
  using (public.party_is_member(room_id));

alter table public.party_submissions enable row level security;
create policy "party_submissions_select" on public.party_submissions for select to authenticated
  using (
    public.party_is_member(room_id)
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.party_rooms pr
        where pr.id = party_submissions.room_id
          and pr.phase in ('voting', 'reveal', 'finished')
      )
    )
  );

alter table public.party_votes enable row level security;

alter table public.party_round_results enable row level security;
create policy "party_round_results_select" on public.party_round_results for select to authenticated
  using (
    public.party_is_member(room_id)
    and exists (
      select 1 from public.party_rooms pr
      where pr.id = party_round_results.room_id
        and pr.phase in ('reveal', 'finished')
    )
  );

alter table public.party_reactions enable row level security;
create policy "party_reactions_select" on public.party_reactions for select to authenticated
  using (
    public.party_is_member(room_id)
    and exists (
      select 1 from public.party_rooms pr
      where pr.id = party_reactions.room_id and pr.phase = 'waiting'
    )
  );

-- Realtime (never party_votes)
alter publication supabase_realtime add table public.party_rooms;
alter publication supabase_realtime add table public.party_players;
alter publication supabase_realtime add table public.party_round_results;
alter publication supabase_realtime add table public.party_reactions;
alter publication supabase_realtime add table public.party_submissions;
