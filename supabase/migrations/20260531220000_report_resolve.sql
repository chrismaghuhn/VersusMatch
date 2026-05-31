-- Report moderation: mark reports as resolved

alter table public.battle_reports
  add column if not exists resolved_at timestamptz;

create index if not exists battle_reports_open_created_at_idx
  on public.battle_reports (created_at desc)
  where resolved_at is null;
