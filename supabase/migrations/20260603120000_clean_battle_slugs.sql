-- Redirect table for old indexed battle URLs (e.g. -seed01, -seo02 suffixes)
create table if not exists public.battle_slug_redirects (
  old_slug text primary key,
  battle_id uuid not null references public.battles(id) on delete cascade
);

create index if not exists battle_slug_redirects_battle_id_idx
  on public.battle_slug_redirects (battle_id);

alter table public.battle_slug_redirects enable row level security;

-- Strip batch suffixes and record redirects for battles that still use them
do $$
declare
  r record;
  v_clean text;
  v_final text;
  v_suffix int;
begin
  for r in
    select id, slug
    from public.battles
    where slug ~ '-(seed|seo)[0-9]+$'
    order by created_at
  loop
    v_clean := regexp_replace(r.slug, '-(seed|seo)[0-9]+$', '');
    v_final := v_clean;
    v_suffix := 2;

    while exists (
      select 1
      from public.battles b
      where b.slug = v_final
        and b.id <> r.id
    ) loop
      v_final := v_clean || '-' || v_suffix;
      v_suffix := v_suffix + 1;
    end loop;

    if v_final <> r.slug then
      insert into public.battle_slug_redirects (old_slug, battle_id)
      values (r.slug, r.id)
      on conflict (old_slug) do update set battle_id = excluded.battle_id;

      update public.battles
      set slug = v_final
      where id = r.id;
    end if;
  end loop;
end $$;
