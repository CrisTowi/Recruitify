-- ============================================================
-- Recruitify – Company offers table
-- ============================================================
create table if not exists company_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade unique,
  base_salary integer,
  currency text not null default 'USD',
  signing_bonus integer,
  equity_value integer,
  equity_vesting text,
  bonus_pct numeric,
  pto_days integer,
  remote_policy text,
  health_tier text,
  retirement_match_pct numeric,
  other_benefits text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company_offers enable row level security;

-- Users can only see/modify their own company's offers (via companies.user_id)
create policy "offer_select" on company_offers
  for select using (
    exists (
      select 1 from companies c
      where c.id = company_offers.company_id
        and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

create policy "offer_insert" on company_offers
  for insert with check (
    exists (
      select 1 from companies c
      where c.id = company_offers.company_id
        and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

create policy "offer_update" on company_offers
  for update using (
    exists (
      select 1 from companies c
      where c.id = company_offers.company_id
        and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

create policy "offer_delete" on company_offers
  for delete using (
    exists (
      select 1 from companies c
      where c.id = company_offers.company_id
        and (c.user_id = auth.uid() or c.user_id is null)
    )
  );
