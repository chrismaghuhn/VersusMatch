-- cast_vote was still executable via PUBLIC grant; lock down to service_role only
revoke execute on function public.cast_vote(uuid, uuid, uuid) from public;
grant execute on function public.cast_vote(uuid, uuid, uuid) to service_role;
