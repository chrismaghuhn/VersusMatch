-- Board Brawl: data-driven board maps (Teil A foundation; editor lands in Teil B)

create table public.bb_maps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  definition jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  -- Minimal structural guard at write time. Full validation happens
  -- server-side in parseBoardMap(); this only blocks obviously broken rows.
  constraint bb_maps_definition_shape check (
    jsonb_typeof(definition) = 'object'
    and (definition ->> 'version') = '1'
    and jsonb_typeof(definition -> 'cells') = 'array'
    and jsonb_array_length(definition -> 'cells') >= 1
    and (definition ->> 'width') ~ '^[0-9]+$'
    and (definition ->> 'height') ~ '^[0-9]+$'
  )
);

create index bb_maps_owner_idx on public.bb_maps (owner_id);
create index bb_maps_public_idx on public.bb_maps (is_public) where is_public;

alter table public.bb_rooms
  add column map_id uuid references public.bb_maps (id) on delete set null;

alter table public.bb_maps enable row level security;

-- Anyone authenticated can read public maps or their own maps.
create policy bb_maps_select on public.bb_maps
  for select
  using (is_public or owner_id = auth.uid());

-- Owners manage their own maps.
create policy bb_maps_insert on public.bb_maps
  for insert
  with check (owner_id = auth.uid());

create policy bb_maps_update on public.bb_maps
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy bb_maps_delete on public.bb_maps
  for delete
  using (owner_id = auth.uid());
