-- MemeFight security hardening

-- cast_vote: server-only via service_role (Next.js /api/vote)
revoke execute on function public.cast_vote(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid) to service_role;

-- count_active_battles: authenticated callers may only query their own count
revoke execute on function public.count_active_battles(uuid) from anon;

create or replace function public.count_active_battles(p_creator_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_creator_id then
    return 0;
  end if;

  return (
    select count(*)::integer
    from public.battles
    where creator_id = p_creator_id
      and status = 'active'
  );
end;
$$;

grant execute on function public.count_active_battles(uuid) to authenticated;

-- get_battle_results: closed battle results intentionally remain public (product decision)

-- Remove votes from Realtime publication (client polls get_battle_results instead)
alter publication supabase_realtime drop table public.votes;

-- Storage: block anon/authenticated listing/download via API; public bucket URLs still work
drop policy if exists "Battle images are publicly readable" on storage.objects;

create policy "Battle images cannot be listed via API"
  on storage.objects
  for select
  to anon, authenticated
  using (false);
