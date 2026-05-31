-- Rewards RPC: extended cast_vote, atomic grant, IP-based pending claim

-- 1. cast_vote: add user_side_pct snapshot + return vote_id
create or replace function public.cast_vote(
  p_battle_id uuid,
  p_option_id uuid,
  p_voter_token uuid,
  p_ip_hash text default null,
  p_user_side_pct integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_battle public.battles%rowtype;
  v_option public.battle_options%rowtype;
  v_vote_id uuid;
begin
  if p_voter_token is null then
    return json_build_object('success', false, 'error', 'invalid_voter_token');
  end if;

  select * into v_battle
  from public.battles
  where id = p_battle_id
    and status = 'active';

  if not found then
    return json_build_object('success', false, 'error', 'battle_not_found');
  end if;

  select * into v_option
  from public.battle_options
  where id = p_option_id
    and battle_id = p_battle_id;

  if not found then
    return json_build_object('success', false, 'error', 'invalid_option');
  end if;

  if exists (
    select 1
    from public.votes
    where battle_id = p_battle_id
      and voter_token = p_voter_token
  ) then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
  end if;

  if p_ip_hash is not null and exists (
    select 1
    from public.votes
    where battle_id = p_battle_id
      and ip_hash = p_ip_hash
  ) then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
  end if;

  insert into public.votes (battle_id, option_id, voter_token, ip_hash, user_side_pct)
  values (p_battle_id, p_option_id, p_voter_token, p_ip_hash, p_user_side_pct)
  returning id into v_vote_id;

  return json_build_object('success', true, 'vote_id', v_vote_id);
exception
  when unique_violation then
    return json_build_object('success', false, 'error', 'already_voted', 'already_voted', true);
end;
$$;

drop function if exists public.cast_vote(uuid, uuid, uuid, text);

revoke execute on function public.cast_vote(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid, text, integer) to service_role;

-- 2. grant_reward_for_vote: atomic XP + progress + badges
create or replace function public.grant_reward_for_vote(
  p_user_id uuid,
  p_vote_id uuid,
  p_is_featured boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant_id uuid;
  v_vote record;
  v_today date := (now() at time zone 'utc')::date;
  v_season_id uuid;
  v_xp integer := 0;
  v_is_underdog boolean := false;
  v_has_battle_xp_today boolean;
  v_has_fotd_today boolean;
  v_is_first_vote_today boolean;
  v_progress public.user_progress%rowtype;
  v_new_streak integer;
  v_new_total_xp integer;
  v_new_underdog_count integer;
  v_new_season_vote_count integer;
  v_badges text[] := '{}';
  v_is_first_grant_ever boolean;
  v_badge_key text;
begin
  insert into public.reward_grants (user_id, vote_id, xp_awarded)
  values (p_user_id, p_vote_id, 0)
  on conflict (vote_id) do nothing
  returning id into v_grant_id;

  if v_grant_id is null then
    return jsonb_build_object('success', true, 'already_granted', true);
  end if;

  select v.id, v.battle_id, v.user_side_pct
  into v_vote
  from public.votes v
  where v.id = p_vote_id;

  if not found then
    delete from public.reward_grants where id = v_grant_id;
    return jsonb_build_object('success', false, 'error', 'vote_not_found');
  end if;

  select id into v_season_id
  from public.seasons
  where now() between starts_at and ends_at
  limit 1;

  if v_season_id is null then
    delete from public.reward_grants where id = v_grant_id;
    return jsonb_build_object('success', false, 'error', 'no_active_season');
  end if;

  v_is_underdog := v_vote.user_side_pct is not null and v_vote.user_side_pct < 40;

  select exists (
    select 1
    from public.reward_grants rg
    join public.votes v on v.id = rg.vote_id
    where rg.user_id = p_user_id
      and v.battle_id = v_vote.battle_id
      and (rg.created_at at time zone 'utc')::date = v_today
      and rg.id <> v_grant_id
      and rg.xp_awarded > 0
  ) into v_has_battle_xp_today;

  if not v_has_battle_xp_today then
    v_xp := v_xp + 10;
  end if;

  if p_is_featured then
    select exists (
      select 1
      from public.reward_grants rg
      join public.votes v on v.id = rg.vote_id
      join public.featured_battles fb
        on fb.battle_id = v.battle_id
       and fb.featured_date = v_today
      where rg.user_id = p_user_id
        and (rg.created_at at time zone 'utc')::date = v_today
        and rg.id <> v_grant_id
    ) into v_has_fotd_today;

    if not v_has_fotd_today then
      v_xp := v_xp + 25;
    end if;
  end if;

  select *
  into v_progress
  from public.user_progress
  where user_id = p_user_id
    and season_id = v_season_id;

  select not exists (
    select 1
    from public.reward_grants rg
    where rg.user_id = p_user_id
      and (rg.created_at at time zone 'utc')::date = v_today
      and rg.id <> v_grant_id
  ) into v_is_first_vote_today;

  if v_is_first_vote_today
     and v_progress.user_id is not null
     and v_progress.last_rewarded_vote_date = v_today - 1
     and v_progress.current_streak >= 1 then
    v_xp := v_xp + 15;
  end if;

  if v_is_underdog then
    v_xp := v_xp + 5;
  end if;

  if v_progress.user_id is null then
    v_new_streak := 1;
  elsif v_progress.last_rewarded_vote_date = v_today then
    v_new_streak := v_progress.current_streak;
  elsif v_progress.last_rewarded_vote_date = v_today - 1 then
    v_new_streak := v_progress.current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  select not exists (
    select 1
    from public.reward_grants
    where user_id = p_user_id
      and id <> v_grant_id
  ) into v_is_first_grant_ever;

  update public.reward_grants
  set xp_awarded = v_xp
  where id = v_grant_id;

  insert into public.user_progress (
    user_id,
    season_id,
    xp,
    current_streak,
    longest_streak,
    last_rewarded_vote_date,
    underdog_count,
    season_vote_count
  )
  values (
    p_user_id,
    v_season_id,
    v_xp,
    v_new_streak,
    v_new_streak,
    v_today,
    case when v_is_underdog then 1 else 0 end,
    1
  )
  on conflict (user_id, season_id) do update set
    xp = user_progress.xp + excluded.xp,
    current_streak = v_new_streak,
    longest_streak = greatest(user_progress.longest_streak, v_new_streak),
    last_rewarded_vote_date = v_today,
    underdog_count = user_progress.underdog_count + case when v_is_underdog then 1 else 0 end,
    season_vote_count = user_progress.season_vote_count + 1
  returning xp, underdog_count, season_vote_count
  into v_new_total_xp, v_new_underdog_count, v_new_season_vote_count;

  if v_is_first_grant_ever then
    insert into public.user_badges (user_id, badge_key)
    values (p_user_id, 'first_blood')
    on conflict (user_id, badge_key) do nothing
    returning badge_key into v_badge_key;

    if v_badge_key is not null then
      v_badges := array_append(v_badges, v_badge_key);
    end if;
  end if;

  if v_new_streak >= 7 then
    insert into public.user_badges (user_id, badge_key)
    values (p_user_id, 'week_warrior')
    on conflict (user_id, badge_key) do nothing
    returning badge_key into v_badge_key;

    if v_badge_key is not null then
      v_badges := array_append(v_badges, v_badge_key);
    end if;
  end if;

  if v_new_underdog_count >= 5 then
    insert into public.user_badges (user_id, badge_key)
    values (p_user_id, 'underdog')
    on conflict (user_id, badge_key) do nothing
    returning badge_key into v_badge_key;

    if v_badge_key is not null then
      v_badges := array_append(v_badges, v_badge_key);
    end if;
  end if;

  if v_new_season_vote_count >= 50 then
    insert into public.user_badges (user_id, badge_key)
    values (p_user_id, 'fight_fanatic')
    on conflict (user_id, badge_key) do nothing
    returning badge_key into v_badge_key;

    if v_badge_key is not null then
      v_badges := array_append(v_badges, v_badge_key);
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_granted', false,
    'xp_awarded', v_xp,
    'badges_earned', to_jsonb(v_badges),
    'current_streak', v_new_streak,
    'total_xp', v_new_total_xp
  );
end;
$$;

revoke execute on function public.grant_reward_for_vote(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.grant_reward_for_vote(uuid, uuid, boolean) to service_role;

-- 3. claim_pending_reward_by_ip: match recent anonymous vote by IP
create or replace function public.claim_pending_reward_by_ip(
  p_user_id uuid,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_id uuid;
  v_battle_id uuid;
  v_is_featured boolean;
  v_grant_result jsonb;
begin
  if p_ip_hash is null then
    return jsonb_build_object('granted', false);
  end if;

  select v.id, v.battle_id
  into v_vote_id, v_battle_id
  from public.votes v
  where v.ip_hash = p_ip_hash
    and v.user_side_pct is not null
    and v.created_at > now() - interval '10 minutes'
    and not exists (
      select 1
      from public.reward_grants rg
      where rg.vote_id = v.id
    )
  order by v.created_at desc
  limit 1;

  if v_vote_id is null then
    return jsonb_build_object('granted', false);
  end if;

  select exists (
    select 1
    from public.featured_battles fb
    where fb.battle_id = v_battle_id
      and fb.featured_date = (now() at time zone 'utc')::date
  ) into v_is_featured;

  v_grant_result := public.grant_reward_for_vote(p_user_id, v_vote_id, v_is_featured);

  return v_grant_result || jsonb_build_object('granted', true);
end;
$$;

revoke execute on function public.claim_pending_reward_by_ip(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_pending_reward_by_ip(uuid, text) to service_role;
