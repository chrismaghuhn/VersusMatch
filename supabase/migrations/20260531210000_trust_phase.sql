-- MemeFight trust phase: IP dedup, reports, categories, creator policies

-- Categories for feed filtering
alter table public.battles
  add column if not exists category text not null default 'general'
  check (category in ('general', 'memes', 'design', 'food', 'gaming', 'music'));

create index if not exists battles_category_status_created_at_idx
  on public.battles (category, status, created_at desc);

-- IP hash dedup (hashed server-side, never store raw IP)
alter table public.votes
  add column if not exists ip_hash text;

create unique index if not exists votes_battle_id_ip_hash_unique_idx
  on public.votes (battle_id, ip_hash)
  where ip_hash is not null;

-- Battle reports (minimal moderation)
create table if not exists public.battle_reports (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

create index if not exists battle_reports_battle_id_idx on public.battle_reports (battle_id);

alter table public.battle_reports enable row level security;

create policy "Anyone can submit battle reports"
  on public.battle_reports
  for insert
  to anon, authenticated
  with check (true);

create policy "Battle reports are not readable"
  on public.battle_reports
  for select
  to anon, authenticated
  using (false);

-- Creators can read/update/delete own battles
create policy "Creators can read own battles"
  on public.battles
  for select
  to authenticated
  using (auth.uid() = creator_id);

create policy "Creators can delete own battles"
  on public.battles
  for delete
  to authenticated
  using (auth.uid() = creator_id);

-- cast_vote: add IP hash dedup
create or replace function public.cast_vote(
  p_battle_id uuid,
  p_option_id uuid,
  p_voter_token uuid,
  p_ip_hash text default null
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

  if p_ip_hash is not null and exists (
    select 1
    from public.votes
    where battle_id = p_battle_id
      and ip_hash = p_ip_hash
  ) then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
  end if;

  insert into public.votes (battle_id, option_id, voter_token, ip_hash)
  values (p_battle_id, p_option_id, p_voter_token, p_ip_hash);

  return json_build_object('success', true);
exception
  when unique_violation then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
end;
$$;

revoke execute on function public.cast_vote(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid, text) to service_role;

-- Drop old 3-arg overload if present (replaced by 4-arg with default)
drop function if exists public.cast_vote(uuid, uuid, uuid);
