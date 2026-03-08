-- ============================================================
-- Recruitify – Offer expectations (personal targets for comparison)
-- ============================================================
create table if not exists offer_expectations (
  id           integer primary key default 1,
  user_id      uuid references auth.users(id) on delete cascade,
  base_salary  integer,
  currency     text not null default 'USD',
  signing_bonus integer,
  equity_value integer,
  bonus_pct    numeric,
  pto_days     integer,
  remote_policy text,
  health_tier  text,
  retirement_match_pct numeric,
  updated_at   timestamptz not null default now()
);

alter table offer_expectations enable row level security;

create policy "expectations_select" on offer_expectations
  for select using (user_id = auth.uid() or user_id is null);

create policy "expectations_insert" on offer_expectations
  for insert with check (user_id = auth.uid() or user_id is null);

create policy "expectations_update" on offer_expectations
  for update using (user_id = auth.uid() or user_id is null);
