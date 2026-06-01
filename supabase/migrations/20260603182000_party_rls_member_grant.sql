-- party_is_member is invoked by RLS policies on party_* tables.
-- A prior security pass revoked authenticated EXECUTE, which broke all member reads.

grant execute on function public.party_is_member(uuid) to authenticated;
