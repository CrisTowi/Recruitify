-- ============================================================
-- Recruitify – Invitations & User-scoped RLS
-- Run this migration if you are using SUPABASE_AUTH=true
-- (hosted service or private multi-user self-host).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: invitations
-- Stores the emails allowed to sign in via magic-link.
-- ────────────────────────────────────────────────────────────
create table if not exists invitations (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  invited_by text,
  created_at timestamptz not null default now()
);

alter table invitations enable row level security;

-- Invitations are only readable/writable via the service-role key (server-side).
-- Regular anon/authenticated clients cannot access this table.
create policy "service role only – invitations"
  on invitations for all using (false);

-- ────────────────────────────────────────────────────────────
-- Add user_id columns to data tables
-- Required for per-user data isolation in auth mode.
-- ────────────────────────────────────────────────────────────
alter table companies
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table timeline_events
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table google_tokens
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ────────────────────────────────────────────────────────────
-- Update RLS policies to be user-scoped
-- Drop the old open policies and replace with per-user ones.
-- ────────────────────────────────────────────────────────────
drop policy if exists "service role full access – companies" on companies;
drop policy if exists "service role full access – roadmap" on interviews_roadmap;
drop policy if exists "service role full access – offers" on offers;
drop policy if exists "service role full access – timeline_events" on timeline_events;

-- Companies: users can only see and modify their own rows
create policy "users own their companies"
  on companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- interviews_roadmap inherits access via company ownership
create policy "users own their roadmap via company"
  on interviews_roadmap for all
  using (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select id from companies where user_id = auth.uid()
    )
  );

-- timeline_events: user_id column or via company ownership
create policy "users own their timeline events"
  on timeline_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- google_tokens: one row per user
create policy "users own their google tokens"
  on google_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
