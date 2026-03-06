-- ============================================================
-- Recruitify – Add notes to interviews_roadmap
-- ============================================================
alter table interviews_roadmap
  add column if not exists notes text;
