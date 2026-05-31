-- VersusApp V1 schema

create extension if not exists "pgcrypto";

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 120),
  creator_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.battle_options (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  image_path text,
  position smallint not null check (position in (0, 1)),
  created_at timestamptz not null default now(),
  unique (battle_id, position)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  option_id uuid not null references public.battle_options (id) on delete cascade,
  voter_token uuid not null,
  created_at timestamptz not null default now(),
  unique (battle_id, voter_token)
);

create index battles_status_created_at_idx on public.battles (status, created_at desc);
create index battles_creator_status_idx on public.battles (creator_id, status);
create index votes_battle_id_idx on public.votes (battle_id);
create index votes_option_id_idx on public.votes (option_id);

alter table public.battles enable row level security;
alter table public.battle_options enable row level security;
alter table public.votes enable row level security;

create policy "Active battles are publicly readable"
  on public.battles
  for select
  to anon, authenticated
  using (status = 'active');

create policy "Creators can insert battles"
  on public.battles
  for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Creators can update own battles"
  on public.battles
  for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Battle options are publicly readable"
  on public.battle_options
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.battles b
      where b.id = battle_options.battle_id
        and b.status = 'active'
    )
  );

create policy "Creators can insert battle options"
  on public.battle_options
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.battles b
      where b.id = battle_options.battle_id
        and b.creator_id = auth.uid()
    )
  );

create policy "Votes are not directly readable"
  on public.votes
  for select
  to anon, authenticated
  using (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battle-images',
  'battle-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Battle images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'battle-images');

create policy "Authenticated users can upload battle images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'battle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can update own battle images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'battle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'battle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can delete own battle images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'battle-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.count_active_battles(p_creator_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.battles
  where creator_id = p_creator_id
    and status = 'active';
$$;

create or replace function public.get_battle_results(p_battle_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    json_agg(
      json_build_object(
        'option_id', bo.id,
        'position', bo.position,
        'label', bo.label,
        'image_path', bo.image_path,
        'vote_count', coalesce(vc.count, 0)
      )
      order by bo.position
    ),
    '[]'::json
  )
  from public.battle_options bo
  left join (
    select option_id, count(*) as count
    from public.votes
    where battle_id = p_battle_id
    group by option_id
  ) vc on vc.option_id = bo.id
  where bo.battle_id = p_battle_id;
$$;

create or replace function public.cast_vote(
  p_battle_id uuid,
  p_option_id uuid,
  p_voter_token uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_battle public.battles%rowtype;
  v_option public.battle_options%rowtype;
begin
  if p_voter_token is null then
    return json_build_object('success', false, 'error', 'invalid_voter_token');
  end if;

  select * into v_battle
  from public.battles
  where id = p_battle_id
    and status = 'active';

  if not found then
    return json_build_object('success', false, 'error', 'battle_not_found');
  end if;

  select * into v_option
  from public.battle_options
  where id = p_option_id
    and battle_id = p_battle_id;

  if not found then
    return json_build_object('success', false, 'error', 'invalid_option');
  end if;

  if exists (
    select 1
    from public.votes
    where battle_id = p_battle_id
      and voter_token = p_voter_token
  ) then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
  end if;

  insert into public.votes (battle_id, option_id, voter_token)
  values (p_battle_id, p_option_id, p_voter_token);

  return json_build_object('success', true);
exception
  when unique_violation then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
end;
$$;

grant execute on function public.count_active_battles(uuid) to anon, authenticated;
grant execute on function public.get_battle_results(uuid) to anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid) to anon, authenticated;

alter publication supabase_realtime add table public.votes;
