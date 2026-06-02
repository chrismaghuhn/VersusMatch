-- Security review fixes: scope membership-history RPCs, harden caption JSON,
-- and avoid returning avatar URLs from anonymous party recaps.

create or replace function public.party_user_was_room_member(
  p_room_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id = auth.uid()
    and exists (
      select 1
      from public.party_analytics_events pae
      where pae.room_id = p_room_id
        and pae.event_type = 'player_joined'
        and pae.meta ->> 'user_id' = p_user_id::text
    );
$$;

revoke all on function public.party_user_was_room_member(uuid, uuid) from public;
grant execute on function public.party_user_was_room_member(uuid, uuid) to authenticated;

create or replace function public.party_caption_box_style_is_valid(p_style jsonb)
returns boolean
language sql
immutable
as $$
  select p_style is null
    or (
      jsonb_typeof(p_style) = 'object'
      and not exists (
        select 1
        from jsonb_object_keys(p_style) as k(key)
        where k.key not in ('fill', 'pill')
      )
      and case
        when p_style ? 'fill' then
          jsonb_typeof(p_style->'fill') = 'string'
          and p_style->>'fill' in ('white', 'black')
        else true
      end
      and case
        when p_style ? 'pill' then jsonb_typeof(p_style->'pill') = 'boolean'
        else true
      end
    );
$$;

create or replace function public.party_caption_segment_style_is_valid(p_style jsonb)
returns boolean
language sql
immutable
as $$
  select p_style is null
    or (
      jsonb_typeof(p_style) = 'object'
      and not exists (
        select 1
        from jsonb_object_keys(p_style) as k(key)
        where k.key not in ('caps', 'slant', 'scale', 'italic', 'fill')
      )
      and case
        when p_style ? 'caps' then jsonb_typeof(p_style->'caps') = 'boolean'
        else true
      end
      and case
        when p_style ? 'italic' then jsonb_typeof(p_style->'italic') = 'boolean'
        else true
      end
      and case
        when p_style ? 'fill' then
          jsonb_typeof(p_style->'fill') = 'string'
          and p_style->>'fill' in ('white', 'black')
        else true
      end
      and case
        when p_style ? 'slant' then
          jsonb_typeof(p_style->'slant') = 'number'
          and (p_style->>'slant')::numeric between -45 and 45
        else true
      end
      and case
        when p_style ? 'scale' then
          jsonb_typeof(p_style->'scale') = 'number'
          and (p_style->>'scale')::numeric between 0.5 and 2
        else true
      end
    );
$$;

create or replace function public.party_caption_segment_is_valid(p_segment jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p_segment) = 'object'
    and not exists (
      select 1
      from jsonb_object_keys(p_segment) as k(key)
      where k.key not in ('text', 'style')
    )
    and jsonb_typeof(p_segment->'text') = 'string'
    and char_length(p_segment->>'text') <= 120
    and public.party_caption_segment_style_is_valid(p_segment->'style');
$$;

create or replace function public.party_caption_segments_are_valid(p_segments jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_segment jsonb;
begin
  if jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) > 160 then
    return false;
  end if;

  for v_segment in select value from jsonb_array_elements(p_segments)
  loop
    if not public.party_caption_segment_is_valid(v_segment) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.party_caption_raw_texts_are_valid(
  p_raw_texts jsonb,
  p_box_count int
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_raw jsonb;
  v_total int := 0;
begin
  if jsonb_typeof(p_raw_texts) <> 'array'
    or jsonb_array_length(p_raw_texts) <> p_box_count then
    return false;
  end if;

  for v_raw in select value from jsonb_array_elements(p_raw_texts)
  loop
    if jsonb_typeof(v_raw) <> 'string' then
      return false;
    end if;

    v_total := v_total + char_length(v_raw #>> '{}');
    if v_total > 120 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.party_validate_caption_v2_submit(
  p_rich jsonb,
  p_template_box_count int
)
returns text
language plpgsql
immutable
as $$
declare
  v_box jsonb;
  v_total int;
begin
  if p_rich->>'v' is distinct from '2' then
    return 'invalid_caption';
  end if;

  if jsonb_typeof(p_rich->'boxes') <> 'array' then
    return 'invalid_caption';
  end if;

  v_total := jsonb_array_length(p_rich->'boxes');
  if v_total <> p_template_box_count or v_total > 6 then
    return 'invalid_caption';
  end if;

  for v_box in select value from jsonb_array_elements(p_rich->'boxes')
  loop
    if not public.party_caption_segments_are_valid(v_box) then
      return 'invalid_caption';
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.party_validate_caption_v3_submit(
  p_rich jsonb,
  p_template_box_count int
)
returns text
language plpgsql
immutable
as $$
declare
  v_box jsonb;
  v_template_count int := 0;
  v_custom_count int := 0;
  v_emoji_count int := 0;
  v_total int;
  v_kind text;
  v_i int;
begin
  if p_rich->>'v' is distinct from '3' then
    return 'invalid_caption';
  end if;

  if jsonb_typeof(p_rich->'layoutRevision') <> 'number'
    or (p_rich->>'layoutRevision') !~ '^-?\d+$' then
    return 'invalid_caption';
  end if;

  if jsonb_typeof(p_rich->'boxes') <> 'array' then
    return 'invalid_caption';
  end if;

  v_total := jsonb_array_length(p_rich->'boxes');
  if v_total > 6 then
    return 'invalid_caption';
  end if;

  if not public.party_caption_raw_texts_are_valid(p_rich->'rawTexts', v_total) then
    return 'invalid_caption';
  end if;

  for v_box in select value from jsonb_array_elements(p_rich->'boxes')
  loop
    if jsonb_typeof(v_box) <> 'object' then
      return 'invalid_caption';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(v_box) as k(key)
      where k.key not in ('id', 'kind', 'templateIndex', 'segments', 'layout', 'style', 'z')
    ) then
      return 'invalid_caption';
    end if;

    if jsonb_typeof(v_box->'id') <> 'string' or char_length(v_box->>'id') > 64 then
      return 'invalid_caption';
    end if;

    v_kind := v_box->>'kind';
    if v_kind = 'template' then
      v_template_count := v_template_count + 1;
      if (v_box->>'templateIndex') is null
        or jsonb_typeof(v_box->'templateIndex') <> 'number'
        or (v_box->>'templateIndex') !~ '^-?\d+$'
        or (v_box->>'templateIndex')::int < 0
        or (v_box->>'templateIndex')::int >= p_template_box_count then
        return 'invalid_caption';
      end if;
    elsif v_kind = 'custom' then
      v_custom_count := v_custom_count + 1;
      if v_box ? 'templateIndex' then
        return 'invalid_caption';
      end if;
    elsif v_kind = 'emoji' then
      v_emoji_count := v_emoji_count + 1;
      if v_box ? 'templateIndex' then
        return 'invalid_caption';
      end if;
    else
      return 'invalid_caption';
    end if;

    if v_box ? 'z'
      and (
        jsonb_typeof(v_box->'z') <> 'number'
        or (v_box->>'z') !~ '^-?\d+$'
      ) then
      return 'invalid_caption';
    end if;

    if not public.party_caption_segments_are_valid(v_box->'segments') then
      return 'invalid_caption';
    end if;

    if jsonb_typeof(v_box->'layout') <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(v_box->'layout') as k(key)
        where k.key not in ('x', 'y', 'w', 'h', 'align')
      )
      or (
        v_box->'layout' ? 'align'
        and (
          jsonb_typeof(v_box->'layout'->'align') <> 'string'
          or v_box->'layout'->>'align' not in ('left', 'center', 'right')
        )
      ) then
      return 'invalid_caption';
    end if;

    if not public.party_validate_box_layout(v_box->'layout') then
      return 'invalid_caption';
    end if;

    if not public.party_caption_box_style_is_valid(v_box->'style') then
      return 'invalid_caption';
    end if;
  end loop;

  if v_template_count <> p_template_box_count then
    return 'invalid_caption';
  end if;

  if v_custom_count > 2 or v_emoji_count > 1 then
    return 'invalid_caption';
  end if;

  for v_i in 0..(p_template_box_count - 1)
  loop
    if not exists (
      select 1
      from jsonb_array_elements(p_rich->'boxes') b
      where b->>'kind' = 'template'
        and (b->>'templateIndex')::int = v_i
    ) then
      return 'invalid_caption';
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.party_submit_caption(
  p_room_id uuid,
  p_caption text,
  p_caption_rich jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.party_rooms%rowtype;
  v_caption text;
  v_plain text;
  v_submission_id uuid;
  v_template_id uuid;
  v_box_count int;
  v_layout_revision smallint;
  v_validation_error text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into v_room from public.party_rooms where id = p_room_id for update;

  if v_room.phase <> 'caption' then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if not exists (select 1 from public.party_players where room_id = p_room_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_room');
  end if;

  if exists (
    select 1 from public.party_submissions
    where room_id = p_room_id and round = v_room.current_round and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_submitted');
  end if;

  select template_id, layout_revision
  into v_template_id, v_layout_revision
  from public.party_player_rounds
  where room_id = p_room_id
    and round = v_room.current_round
    and user_id = v_uid;

  if v_template_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_template');
  end if;

  select jsonb_array_length(t.text_boxes) into v_box_count
  from public.party_templates t
  where t.id = v_template_id;

  if v_room.canvas_editor_enabled then
    if p_caption_rich is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if p_caption_rich->>'v' is distinct from '3' then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    v_validation_error := public.party_validate_caption_v3_submit(p_caption_rich, v_box_count);
    if v_validation_error is not null then
      return jsonb_build_object('ok', false, 'error', v_validation_error);
    end if;

    if (p_caption_rich->>'layoutRevision')::int is distinct from v_layout_revision::int then
      return jsonb_build_object('ok', false, 'error', 'stale_revision');
    end if;

    v_plain := public.party_caption_plain_from_rich(p_caption_rich);

    if p_caption is distinct from v_plain then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if char_length(v_plain) < 1 or char_length(v_plain) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_plain) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    v_caption := v_plain;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      p_caption_rich,
      v_template_id
    )
    returning id into v_submission_id;

    update public.party_player_rounds
    set caption_draft = null
    where room_id = p_room_id
      and round = v_room.current_round
      and user_id = v_uid;
  elsif p_caption_rich is not null then
    v_validation_error := public.party_validate_caption_v2_submit(p_caption_rich, v_box_count);
    if v_validation_error is not null then
      return jsonb_build_object('ok', false, 'error', v_validation_error);
    end if;

    v_plain := public.party_caption_plain_from_rich(p_caption_rich);

    if p_caption is distinct from v_plain then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if char_length(v_plain) < 1 or char_length(v_plain) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_plain) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    v_caption := v_plain;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      p_caption_rich,
      v_template_id
    )
    returning id into v_submission_id;
  else
    if v_box_count >= 3 then
      return jsonb_build_object('ok', false, 'error', 'caption_rich_required');
    end if;

    v_caption := trim(p_caption);

    if char_length(v_caption) < 1 or char_length(v_caption) > 120 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if public.party_caption_has_profanity(v_caption) then
      return jsonb_build_object('ok', false, 'error', 'profanity_rejected');
    end if;

    insert into public.party_submissions (
      room_id,
      round,
      user_id,
      caption,
      caption_rich,
      template_id
    )
    values (
      p_room_id,
      v_room.current_round,
      v_uid,
      v_caption,
      null,
      v_template_id
    )
    returning id into v_submission_id;
  end if;

  update public.party_rooms set caption_count = caption_count + 1 where id = p_room_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

revoke all on function public.party_submit_caption(uuid, text, jsonb) from public;
grant execute on function public.party_submit_caption(uuid, text, jsonb) to authenticated;

create or replace function public.party_get_recap(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.party_rooms%rowtype;
  v_winners jsonb;
  v_round_winner jsonb;
begin
  select * into v_room from public.party_rooms where code = upper(trim(p_code));

  if v_room.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_room.status <> 'finished' or v_room.phase <> 'finished' then
    return jsonb_build_object('ok', false, 'error', 'not_finished');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', pr.handle,
    'score', pp.score
  ) order by pp.score desc), '[]'::jsonb)
  into v_winners
  from public.party_players pp
  join public.profiles pr on pr.user_id = pp.user_id
  where pp.room_id = v_room.id
    and pp.score = (select max(score) from public.party_players where room_id = v_room.id)
    and pp.score > 0;

  select jsonb_build_object(
    'handle', pr.handle,
    'caption', ps.caption,
    'captionRich', ps.caption_rich,
    'voteCount', prr.vote_count,
    'templateId', ps.template_id
  )
  into v_round_winner
  from public.party_round_results prr
  join public.party_submissions ps on ps.id = prr.submission_id
  join public.profiles pr on pr.user_id = ps.user_id
  where prr.room_id = v_room.id
  order by prr.vote_count desc, prr.submission_id asc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'roomCode', v_room.code,
    'roundCount', v_room.round_count,
    'gameWinners', v_winners,
    'roundWinner', v_round_winner
  );
end;
$$;

revoke all on function public.party_get_recap(text) from public;
grant execute on function public.party_get_recap(text) to anon, authenticated;
