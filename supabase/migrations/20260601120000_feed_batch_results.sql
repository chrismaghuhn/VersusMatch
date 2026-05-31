-- Batch feed query: battles + options + vote counts in one RPC (replaces N+1 get_battle_results calls)

create or replace function public.get_feed_with_results(
  p_limit integer default 12,
  p_category text default 'all',
  p_sort text default 'new'
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with battle_votes as (
    select
      b.id,
      b.slug,
      b.title,
      b.creator_id,
      b.status,
      b.category,
      b.created_at,
      b.expires_at,
      coalesce(count(v.id), 0)::integer as total_votes
    from public.battles b
    left join public.votes v on v.battle_id = b.id
    where b.status = 'active'
      and (p_category = 'all' or b.category = p_category)
    group by b.id
  ),
  ranked as (
    select *
    from battle_votes
    order by
      case when p_sort = 'votes' then total_votes end desc nulls last,
      created_at desc
    limit greatest(p_limit, 1)
  )
  select coalesce(
    json_agg(
      json_build_object(
        'id', r.id,
        'slug', r.slug,
        'title', r.title,
        'creator_id', r.creator_id,
        'status', r.status,
        'category', r.category,
        'created_at', r.created_at,
        'expires_at', r.expires_at,
        'total_votes', r.total_votes,
        'battle_options', (
          select coalesce(
            json_agg(
              json_build_object(
                'id', bo.id,
                'battle_id', bo.battle_id,
                'label', bo.label,
                'image_path', bo.image_path,
                'position', bo.position,
                'created_at', bo.created_at
              )
              order by bo.position
            ),
            '[]'::json
          )
          from public.battle_options bo
          where bo.battle_id = r.id
        ),
        'results', (
          select coalesce(
            json_agg(
              json_build_object(
                'option_id', bo.id,
                'position', bo.position,
                'label', bo.label,
                'image_path', bo.image_path,
                'vote_count', coalesce(vc.cnt, 0)
              )
              order by bo.position
            ),
            '[]'::json
          )
          from public.battle_options bo
          left join (
            select option_id, count(*)::integer as cnt
            from public.votes
            where battle_id = r.id
            group by option_id
          ) vc on vc.option_id = bo.id
          where bo.battle_id = r.id
        )
      )
    ),
    '[]'::json
  )
  from ranked r;
$$;

grant execute on function public.get_feed_with_results(integer, text, text) to anon, authenticated;
