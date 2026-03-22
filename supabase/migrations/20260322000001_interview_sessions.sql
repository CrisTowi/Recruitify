-- Interview simulation sessions and per-question records.

create table if not exists interview_sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade,
  company_id           uuid not null references companies(id) on delete cascade,
  stage_id             uuid not null references interviews_roadmap(id) on delete cascade,
  status               text not null default 'configuring',
  feedback_mode        text not null default 'immediate',
  num_questions        integer not null default 5,
  interviewer_persona  text,
  difficulty           text not null default 'medium',
  focus_areas          text not null default '[]',
  overall_score        real,
  debrief_summary      text,
  debrief_strengths    text not null default '[]',
  debrief_improvements text not null default '[]',
  debrief_resources    text not null default '[]',
  started_at           timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists idx_interview_sessions_company_id on interview_sessions (company_id);
create index if not exists idx_interview_sessions_stage_id on interview_sessions (stage_id);
create index if not exists idx_interview_sessions_user_id on interview_sessions (user_id);

alter table interview_sessions enable row level security;

create policy "interview_sessions: owner access"
  on interview_sessions
  for all
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- Per-question records within a session.

create table if not exists session_questions (
  id                        uuid primary key default gen_random_uuid(),
  session_id                uuid not null references interview_sessions(id) on delete cascade,
  question_number           integer not null,
  question_text             text not null,
  answer_transcript         text,
  score                     real,
  feedback_strengths        text,
  feedback_improvements     text,
  feedback_suggested_answer text,
  duration_seconds          integer,
  created_at                timestamptz not null default now()
);

create index if not exists idx_session_questions_session_id on session_questions (session_id);

alter table session_questions enable row level security;

-- RLS via join to interview_sessions: question is accessible if parent session is accessible.
create policy "session_questions: owner access"
  on session_questions
  for all
  using (
    exists (
      select 1 from interview_sessions s
      where s.id = session_questions.session_id
        and (s.user_id = auth.uid() or s.user_id is null)
    )
  )
  with check (
    exists (
      select 1 from interview_sessions s
      where s.id = session_questions.session_id
        and (s.user_id = auth.uid() or s.user_id is null)
    )
  );
