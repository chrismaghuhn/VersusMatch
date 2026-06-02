-- Board Brawl: stale host migration (mirrors party_migrate_host_if_stale)

create or replace function public.bb_migrate_host_if_stale(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_stale timestamptz;
  v_new_host uuid;
begin
  select host_id into v_host_id from public.bb_rooms where id = p_room_id;
  if v_host_id is null then
    return;
  end if;

  select last_seen_at into v_stale
  from public.bb_players
  where room_id = p_room_id and user_id = v_host_id;

  if v_stale is null or v_stale >= now() - interval '60 seconds' then
    return;
  end if;

  select user_id into v_new_host
  from public.bb_players
  where room_id = p_room_id and user_id <> v_host_id
  order by joined_at asc
  limit 1;

  if v_new_host is null then
    return;
  end if;

  update public.bb_players set is_host = false where room_id = p_room_id;
  update public.bb_players set is_host = true where room_id = p_room_id and user_id = v_new_host;
  update public.bb_rooms set host_id = v_new_host where id = p_room_id;
end;
$$;

grant execute on function public.bb_migrate_host_if_stale(uuid) to authenticated;
grant execute on function public.bb_migrate_host_if_stale(uuid) to service_role;
