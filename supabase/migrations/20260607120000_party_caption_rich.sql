alter table public.party_submissions
  add column if not exists caption_rich jsonb;

create or replace function public.party_caption_plain_from_rich(p_rich jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    (
      select string_agg(box_plain, E'\n')
      from (
        select (
          select string_agg(seg->>'text', '')
          from jsonb_array_elements(box) seg
        ) as box_plain
        from jsonb_array_elements(p_rich->'boxes') box
      ) q
    ),
    ''
  );
$$;

drop function if exists public.party_submit_caption(uuid, text);

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

  select template_id into v_template_id
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

  if p_caption_rich is not null then
    if coalesce((p_caption_rich->>'v')::int, 0) <> 2 then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
    end if;

    if jsonb_typeof(p_caption_rich->'boxes') <> 'array'
      or jsonb_array_length(p_caption_rich->'boxes') <> v_box_count then
      return jsonb_build_object('ok', false, 'error', 'invalid_caption');
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
