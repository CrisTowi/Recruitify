-- Replace the partial unique index with a full unique constraint so
-- PostgREST can resolve ON CONFLICT (user_id) for upserts.
drop index if exists uq_user_preferences_user_id;

alter table user_preferences
  add constraint uq_user_preferences_user_id unique (user_id);
