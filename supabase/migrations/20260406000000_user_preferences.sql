-- ────────────────────────────────────────────────────────────
-- TABLE: user_preferences
-- Stores per-user UI preferences (e.g. language).
-- In no-auth mode a single row with id=1 is used.
-- ────────────────────────────────────────────────────────────

create table if not exists user_preferences (
  id          bigint      primary key default 1,
  user_id     uuid        references auth.users(id) on delete cascade,
  language    text        not null default 'en',
  updated_at  timestamptz not null default now()
);

create unique index if not exists uq_user_preferences_user_id
  on user_preferences (user_id)
  where user_id is not null;

-- RLS
alter table user_preferences enable row level security;

create policy "Users can read their own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);
