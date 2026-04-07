-- Add Mexico-specific benefit fields to company_offers and offer_expectations

alter table company_offers
  add column if not exists food_vouchers integer,
  add column if not exists christmas_bonus_days integer,
  add column if not exists savings_fund_pct numeric,
  add column if not exists vacation_premium_pct numeric;

alter table offer_expectations
  add column if not exists food_vouchers integer,
  add column if not exists christmas_bonus_days integer,
  add column if not exists savings_fund_pct numeric,
  add column if not exists vacation_premium_pct numeric;
