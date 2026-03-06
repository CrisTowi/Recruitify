-- Pending migrations for Recruitify
-- Run these in the Supabase SQL editor or via the Supabase CLI.
-- This file is cleared once migrations are confirmed applied.
-- Claude will keep this file updated when new schema changes are introduced.

-- ── 20260306000000_invitations.sql ───────────────────────────
-- Required if using SUPABASE_AUTH=true (hosted/multi-user mode).
-- Adds: invitations table, user_id columns, per-user RLS policies.
-- File: supabase/migrations/20260306000000_invitations.sql

-- ── 20260306000001_company_prep_notes.sql ────────────────────
-- Adds prep_notes TEXT column to companies.
-- File: supabase/migrations/20260306000001_company_prep_notes.sql
