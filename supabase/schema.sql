-- ============================================================
-- Recruitify – Initial Database Schema
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- ENUM: application status
-- ────────────────────────────────────────────────────────────
create type application_status as enum (
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Ghosted'
);

-- ────────────────────────────────────────────────────────────
-- TABLE: companies
-- ────────────────────────────────────────────────────────────
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  name        text             not null,
  logo_url    text,
  status      application_status not null default 'Wishlist',
  created_at  timestamptz      not null default now()
);

create index idx_companies_status on companies (status);

-- ────────────────────────────────────────────────────────────
-- TABLE: interviews_roadmap
-- ────────────────────────────────────────────────────────────
create table if not exists interviews_roadmap (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid        not null references companies (id) on delete cascade,
  stage_name     text        not null,
  is_completed   boolean     not null default false,
  scheduled_date date,
  order_index    integer     not null default 0
);

create index idx_roadmap_company_id on interviews_roadmap (company_id);
create index idx_roadmap_order      on interviews_roadmap (company_id, order_index);

-- ────────────────────────────────────────────────────────────
-- TABLE: offers
-- ────────────────────────────────────────────────────────────
create table if not exists offers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid            not null references companies (id) on delete cascade,
  base_salary   numeric(12, 2)  not null default 0,
  sign_on_bonus numeric(12, 2)           default 0,
  equity_value  numeric(12, 2)           default 0,
  notes         text,
  created_at    timestamptz     not null default now(),
  unique (company_id)  -- one offer per company
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Enable RLS on all tables. Policies are intentionally open
-- for a single-user app; add auth checks here if you add auth.
-- ────────────────────────────────────────────────────────────
alter table companies          enable row level security;
alter table interviews_roadmap enable row level security;
alter table offers             enable row level security;

-- Allow full access via the service-role key (server-side usage)
create policy "service role full access – companies"
  on companies for all using (true);

create policy "service role full access – roadmap"
  on interviews_roadmap for all using (true);

create policy "service role full access – offers"
  on offers for all using (true);

-- ────────────────────────────────────────────────────────────
-- ENUM: timeline event type
-- ────────────────────────────────────────────────────────────
create type timeline_event_type as enum (
  'note',
  'contact',
  'appointment',
  'process_status',
  'status_change'
);
-- If upgrading an existing DB, run:
-- ALTER TYPE timeline_event_type ADD VALUE 'status_change';

-- ────────────────────────────────────────────────────────────
-- ENUM: process status value
-- ────────────────────────────────────────────────────────────
create type process_status_value as enum (
  'Waiting for update',
  'Invited to next step',
  'Idle',
  'Offer pending',
  'Negotiating',
  'Background check',
  'References requested'
);

-- ────────────────────────────────────────────────────────────
-- TABLE: timeline_events
-- ────────────────────────────────────────────────────────────
create table if not exists timeline_events (
  id             uuid                 primary key default gen_random_uuid(),
  company_id     uuid                 not null references companies (id) on delete cascade,
  event_type     timeline_event_type  not null,
  created_at     timestamptz          not null default now(),
  -- note + shared notes field
  title          text,
  body           text,
  -- contact
  contact_name   text,
  contact_role   text,
  contact_email  text,
  -- appointment
  scheduled_at   timestamptz,
  -- process_status
  process_status process_status_value
);

create index idx_timeline_company_id
  on timeline_events (company_id, created_at desc);

alter table timeline_events enable row level security;

create policy "service role full access – timeline_events"
  on timeline_events for all using (true);
