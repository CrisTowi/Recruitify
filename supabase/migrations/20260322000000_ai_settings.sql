-- AI Settings table for storing per-user LLM and voice provider configuration.
-- API keys are stored encrypted at rest (AES-256-GCM) — never stored in plaintext.

create table if not exists ai_settings (
  id            bigint primary key default 1,
  user_id       uuid references auth.users(id) on delete cascade,
  llm_provider  text not null default 'openai',
  llm_model     text not null default 'gpt-4o',
  llm_api_key_encrypted text,
  tts_provider  text,
  tts_api_key_encrypted text,
  tts_voice_id  text,
  stt_provider  text,
  stt_api_key_encrypted text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Single row per user in auth mode
create unique index if not exists uq_ai_settings_user_id
  on ai_settings (user_id)
  where user_id is not null;

-- RLS: users can only read/write their own settings
alter table ai_settings enable row level security;

create policy "ai_settings: owner access"
  on ai_settings
  for all
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
