-- ============================================================
-- Recruitify – Add prep_notes to companies
-- ============================================================
alter table companies
  add column if not exists prep_notes text;
