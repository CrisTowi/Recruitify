# Interview Simulator — Feature Spec

## Overview

The Interview Simulator is a new module for Recruitify that lets users practice realistic interview sessions powered by AI. It integrates directly with the existing company/interview tracking system, using the company context, position details, seniority level, and interview roadmap stages to generate contextually relevant mock interviews.

Users bring their own LLM API key (BYOK model) — Recruitify never pays for inference. The simulator supports voice-based interaction via the Web Speech API with optional cloud TTS/STT providers, two feedback modes (immediate per-question or full post-session), and produces a structured debrief with improvement areas.

---

## Goals

1. **Context-aware simulation** — Pull company name, position, seniority, prep notes, and interview stage type directly from the existing Recruitify data model so every mock interview feels targeted.
2. **Voice-first experience** — Use browser Speech Recognition (STT) and Speech Synthesis (TTS) by default. Optionally allow cloud providers (e.g., ElevenLabs for TTS, Deepgram/Whisper for STT) for higher quality.
3. **BYOK (Bring Your Own Key)** — Support OpenAI, Anthropic, Google Gemini, and OpenRouter. Users configure their provider, model, and API key in a settings page. Keys are stored encrypted per-user.
4. **Session tracking** — Every simulation is a persisted session tied to a company and interview stage. Stores the full transcript, per-question scores, and a final debrief.
5. **Two feedback modes** — (a) Immediate: after each question the AI gives feedback before moving on. (b) Full simulation: feedback only after the entire session ends (manually or when all questions are answered).
6. **Configurable sessions** — Before starting, the user adjusts: number of questions, interviewer persona/role, difficulty level, specific focus areas, and feedback mode.
7. **Debrief report** — After the session, a structured debrief covering: overall score, per-question breakdown, strengths, areas for improvement, suggested resources, and a summary narrative.

---

## User Stories

### US-1: Configure LLM Provider
As a user, I want to add my API key for my preferred LLM provider so the simulator can generate interview questions and feedback without costing the platform owner anything.

**Acceptance criteria:**
- Settings page with provider selector (OpenAI, Anthropic, Gemini, OpenRouter)
- Model selector that updates based on chosen provider
- API key input (masked, stored encrypted)
- "Test connection" button that makes a lightweight API call to verify the key works
- Optional: TTS/STT provider configuration (ElevenLabs API key, etc.)

### US-2: Start a Simulation from Interview Roadmap
As a user, I want to click a "Simulate" button on any interview stage within a company's roadmap, so the simulator automatically pulls the right context.

**Acceptance criteria:**
- "Simulate Interview" button visible on each roadmap stage card
- Clicking it opens a pre-session configuration modal pre-filled with: company name, position, seniority, stage type (behavioral, technical, coding, etc.), and any prep notes
- User can adjust: number of questions (default 5), interviewer persona, difficulty, focus areas, feedback mode
- "Start Session" begins the live interview

### US-3: Voice-Based Interview Session
As a user, I want to speak my answers and hear the interviewer's questions out loud, simulating a real phone/video interview.

**Acceptance criteria:**
- Browser microphone permission requested on session start
- Real-time speech-to-text transcription of user's answers displayed on screen
- AI-generated questions converted to speech via TTS and played automatically
- Visual indicators: recording state, AI thinking/speaking state
- Manual text input fallback for environments without mic access
- Push-to-talk or continuous listening toggle
- Pause/resume session capability

### US-4: Immediate Feedback Mode
As a user, I want the AI to give me feedback after each question so I can learn as I go.

**Acceptance criteria:**
- After the user finishes answering, AI provides: a score (1-10), what was good, what could improve, and a suggested better answer
- User can re-attempt the question or move to next
- Feedback is visible on screen and optionally read aloud
- Transcript records both the original answer and feedback

### US-5: Full Simulation Mode
As a user, I want to complete the entire interview without interruption, getting feedback only at the end.

**Acceptance criteria:**
- AI asks all questions sequentially with no feedback between them
- User can manually end the session early via "End Interview" button
- Session auto-completes when all questions are answered
- On completion, transitions to the debrief view

### US-6: Session Debrief
As a user, I want a detailed debrief after my interview simulation so I know exactly where to improve.

**Acceptance criteria:**
- Overall score with summary narrative
- Per-question breakdown: question text, user's answer (transcript), score, strengths, weaknesses
- Aggregated areas of improvement with actionable suggestions
- Suggested resources or topics to study
- Option to save/export the debrief
- Debrief persisted in the database, viewable from the company detail modal

### US-7: Session History
As a user, I want to see all my past simulation sessions for a given company/stage so I can track my progress over time.

**Acceptance criteria:**
- List of past sessions visible per roadmap stage
- Each entry shows: date, overall score, feedback mode used, number of questions
- Click to expand and view full debrief
- Visual progress indicator (score trend over sessions)

---

## Data Model

### New Tables

#### `ai_settings`
Stores per-user LLM and voice provider configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID / INTEGER | Primary key |
| `user_id` | UUID / TEXT | FK to user (nullable for SQLite single-user) |
| `llm_provider` | TEXT | `openai` \| `anthropic` \| `gemini` \| `openrouter` |
| `llm_model` | TEXT | Model identifier (e.g., `gpt-4o`, `claude-sonnet-4-20250514`) |
| `llm_api_key_encrypted` | TEXT | Encrypted API key |
| `tts_provider` | TEXT | `browser` \| `elevenlabs` \| `openai` (nullable) |
| `tts_api_key_encrypted` | TEXT | Encrypted TTS provider key (nullable) |
| `tts_voice_id` | TEXT | Voice identifier for cloud TTS (nullable) |
| `stt_provider` | TEXT | `browser` \| `deepgram` \| `openai` (nullable) |
| `stt_api_key_encrypted` | TEXT | Encrypted STT provider key (nullable) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### `interview_sessions`
Each simulation session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID / INTEGER | Primary key |
| `user_id` | UUID / TEXT | FK to user (nullable for SQLite) |
| `company_id` | UUID / INTEGER | FK to companies table |
| `stage_id` | UUID / INTEGER | FK to roadmap_stages table |
| `status` | TEXT | `configuring` \| `in_progress` \| `completed` \| `cancelled` |
| `feedback_mode` | TEXT | `immediate` \| `full_simulation` |
| `num_questions` | INTEGER | Configured number of questions |
| `interviewer_persona` | TEXT | Description of interviewer role/style |
| `difficulty` | TEXT | `easy` \| `medium` \| `hard` |
| `focus_areas` | TEXT | JSON array of focus topics |
| `overall_score` | REAL | Aggregate score (nullable, set on completion) |
| `debrief_summary` | TEXT | AI-generated debrief narrative (nullable) |
| `debrief_strengths` | TEXT | JSON array of strengths (nullable) |
| `debrief_improvements` | TEXT | JSON array of improvement areas (nullable) |
| `debrief_resources` | TEXT | JSON array of suggested resources (nullable) |
| `started_at` | TIMESTAMP | When the session started |
| `completed_at` | TIMESTAMP | When the session ended (nullable) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### `session_questions`
Individual questions and answers within a session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID / INTEGER | Primary key |
| `session_id` | UUID / INTEGER | FK to interview_sessions |
| `question_number` | INTEGER | Order within session (1-based) |
| `question_text` | TEXT | The AI-generated question |
| `answer_transcript` | TEXT | User's transcribed answer (nullable) |
| `score` | REAL | Per-question score 1-10 (nullable) |
| `feedback_strengths` | TEXT | What was good (nullable) |
| `feedback_improvements` | TEXT | What to improve (nullable) |
| `feedback_suggested_answer` | TEXT | AI's suggested better answer (nullable) |
| `duration_seconds` | INTEGER | How long user spent on this question |
| `created_at` | TIMESTAMP | Timestamp |

---

## Architecture

### LLM Provider Abstraction

A unified `LLMClient` interface that all providers implement:

```typescript
interface LLMClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}
```

Provider implementations: `OpenAIClient`, `AnthropicClient`, `GeminiClient`, `OpenRouterClient`.

The API key is decrypted server-side per request. LLM calls happen from Next.js API routes (never client-side) to avoid exposing keys.

### Voice Pipeline

```
[User speaks] → [Web Speech API / Cloud STT] → [Text transcript]
     ↓
[Send to LLM API route] → [AI response text]
     ↓
[Web Speech Synthesis / Cloud TTS] → [Audio playback]
```

- **STT (Speech-to-Text):** `webkitSpeechRecognition` / `SpeechRecognition` as default. Optional cloud STT via API route proxy.
- **TTS (Text-to-Speech):** `SpeechSynthesis` as default. Optional cloud TTS (ElevenLabs, OpenAI TTS) via API route that returns audio buffer.

### Session State Machine

```
[configuring] → [in_progress] → [completed]
                      ↓
                 [cancelled]
```

During `in_progress`, the frontend maintains a WebSocket-like polling loop or SSE connection to the API for streaming AI responses.

### Encryption

API keys encrypted at rest using AES-256-GCM. Encryption key stored as environment variable (`ENCRYPTION_KEY`). Keys only decrypted in memory during API calls, never sent to the client.

---

## UI Components

### New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AISettingsModal` | `src/components/AISettingsModal/` | Provider, model, API key configuration |
| `SimulationConfigModal` | `src/components/SimulationConfigModal/` | Pre-session setup (questions, persona, mode) |
| `InterviewSession` | `src/components/InterviewSession/` | The live interview UI (voice controls, transcript, timer) |
| `SessionDebrief` | `src/components/SessionDebrief/` | Post-session debrief view |
| `SessionHistory` | `src/components/SessionHistory/` | List of past sessions per stage |
| `VoiceControls` | `src/components/VoiceControls/` | Mic toggle, push-to-talk, volume, TTS controls |
| `QuestionCard` | `src/components/QuestionCard/` | Display for current question + answer area |
| `FeedbackCard` | `src/components/FeedbackCard/` | Immediate feedback display per question |
| `ScoreIndicator` | `src/components/ScoreIndicator/` | Visual score badge (1-10 scale) |

### Integration Points

- **CompanyDetailModal** — Add "Simulation History" tab showing past sessions for the company
- **Roadmap Stage Card** — Add "Simulate Interview" button
- **Navigation/Settings** — Add "AI Settings" entry point (gear icon or settings page section)

---

## Prompt Engineering

### System Prompt Template (Interview)

```
You are an experienced {interviewer_persona} conducting a {stage_type} interview
at {company_name} for a {seniority_level} {position_title} position.

Company context: {prep_notes}
Focus areas: {focus_areas}
Difficulty: {difficulty}

Rules:
- Ask exactly {num_questions} questions, one at a time
- Stay in character as the interviewer throughout
- Questions should be realistic for this company and role
- Vary question types within the stage category
- Wait for the candidate's response before asking the next question
- {feedback_mode_instructions}
```

### System Prompt Template (Debrief)

```
You are an expert interview coach reviewing a completed {stage_type} interview
simulation for a {seniority_level} {position_title} position at {company_name}.

Review the full transcript below and provide:
1. Overall score (1-10) with justification
2. Per-question scores and specific feedback
3. Top 3 strengths demonstrated
4. Top 3 areas for improvement with actionable advice
5. Suggested resources or topics to study
6. A 2-3 sentence summary narrative

Be constructive, specific, and encouraging. Reference exact quotes from answers.
```

---

## Security Considerations

1. **API keys never reach the browser** — All LLM/TTS/STT cloud calls proxied through Next.js API routes
2. **Encryption at rest** — AES-256-GCM for stored API keys
3. **Rate limiting** — Prevent abuse of proxy API routes (consider per-user rate limits)
4. **Input sanitization** — Transcripts and user inputs sanitized before DB storage
5. **No key logging** — API keys excluded from all server logs
6. **RLS (Supabase mode)** — Sessions and settings scoped to authenticated user via Row Level Security

---

## Non-Goals (v1)

- Code execution environment for coding challenges (future phase)
- Screen sharing / whiteboard simulation
- Multi-participant mock panels
- Video avatar for the interviewer
- Integration with external interview prep platforms
- Automated scheduling of practice sessions
