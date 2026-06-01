-- PostgREST cannot resolve party_create_room(smallint) vs (smallint, smallint).
-- Keep only the 2-arg version (P1.10 rerolls); second param defaults to 0.
drop function if exists public.party_create_room(smallint);

revoke all on function public.party_create_room(smallint, smallint) from public;
grant execute on function public.party_create_room(smallint, smallint) to authenticated;
