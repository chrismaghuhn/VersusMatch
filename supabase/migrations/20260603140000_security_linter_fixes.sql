-- Supabase linter fixes: restrict SECURITY DEFINER RPCs to service_role,
-- remove permissive battle_reports INSERT policy (reports go through API + service role).

-- battle_reports: no direct client inserts (POST /api/report uses service role)
drop policy if exists "Anyone can submit battle reports" on public.battle_reports;

-- count_active_battles: server-only; caller must pass verified creator_id from session
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

revoke all on function public.count_active_battles(uuid) from public;
revoke execute on function public.count_active_battles(uuid) from anon, authenticated;
grant execute on function public.count_active_battles(uuid) to service_role;

-- Public read RPCs: server-side only (Next.js uses service role, not browser anon key)
revoke all on function public.get_battle_results(uuid) from public;
revoke execute on function public.get_battle_results(uuid) from anon, authenticated;
grant execute on function public.get_battle_results(uuid) to service_role;

revoke all on function public.get_feed_with_results(integer, text, text) from public;
revoke execute on function public.get_feed_with_results(integer, text, text) from anon, authenticated;
grant execute on function public.get_feed_with_results(integer, text, text) to service_role;
