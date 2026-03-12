-- Add unique constraint on user_id so upsert ON CONFLICT (user_id) works
alter table offer_expectations
  add constraint offer_expectations_user_id_key unique (user_id);
