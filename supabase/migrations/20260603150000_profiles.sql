-- P0: Party player profiles (handle + preset avatar)

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$')
);

create index profiles_handle_idx on public.profiles (handle);

alter table public.profiles enable row level security;

create policy "profiles_public_read"
  on public.profiles for select
  to authenticated, anon
  using (true);

create policy "profiles_own_insert"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_own_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
