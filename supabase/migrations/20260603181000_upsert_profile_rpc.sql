create or replace function public.upsert_profile(p_handle text, p_avatar_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_handle is null or p_handle !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;

  insert into public.profiles (user_id, handle, avatar_url)
  values (v_uid, p_handle, p_avatar_url)
  on conflict (user_id) do update
    set handle = excluded.handle, avatar_url = excluded.avatar_url;

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'handle_taken');
end;
$$;

revoke all on function public.upsert_profile(text, text) from public, anon;
grant execute on function public.upsert_profile(text, text) to authenticated;
