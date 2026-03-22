# Interview Simulator — Implementation Phases

Each phase is a shippable increment. Complete one before starting the next. Each phase should result in a working, testable feature slice.

---

## Phase 1: AI Settings & LLM Provider Abstraction

**Goal:** Users can configure their LLM provider and API key. Server can make LLM calls.

### Tasks

1. **Database migration** — Create `ai_settings` table for both SQLite and Supabase (with RLS policy for Supabase).

2. **Encryption utility** — Create `src/lib/crypto.ts` with AES-256-GCM encrypt/decrypt functions. Read `ENCRYPTION_KEY` from env. Add env var to `.env.example`.

3. **LLM client abstraction** — Create `src/lib/llm/` directory:
   - `types.ts` — `LLMClient` interface, `ChatMessage`, `ChatOptions`, `ChatResponse` types
   - `openai.ts` — OpenAI client (using `fetch`, no SDK dependency)
   - `anthropic.ts` — Anthropic client
   - `gemini.ts` — Google Gemini client
   - `openrouter.ts` — OpenRouter client (OpenAI-compatible API)
   - `factory.ts` — `createLLMClient(provider, apiKey, model)` factory function

4. **DbAdapter extensions** — Add `getAISettings()` and `upsertAISettings()` to both SQLite and Supabase adapters.

5. **API routes:**
   - `GET /api/ai-settings`
   - `PUT /api/ai-settings`
   - `POST /api/ai-settings/test`
   - `GET /api/llm/models?provider=`

6. **UI: AISettingsModal** — Provider selector, model dropdown, masked API key input, test connection button. Accessible from a settings icon in the app header or navigation.

### Definition of Done
- User can select a provider, enter an API key, pick a model, and test the connection.
- Settings persist across page reloads.
- API keys are encrypted at rest and never returned to the client.
- All four providers work with the test endpoint.

---

## Phase 2: Session Data Model & CRUD

**Goal:** Sessions and questions can be created, read, updated, and deleted. No AI interaction yet.

### Tasks

1. **Database migration** — Create `interview_sessions` and `session_questions` tables for both backends. Add RLS policies for Supabase.

2. **DbAdapter extensions** — Implement all session and question CRUD methods in both SQLite and Supabase adapters.

3. **API routes:**
   - `POST /api/sessions`
   - `GET /api/sessions` (with filters)
   - `GET /api/sessions/{sessionId}`
   - `DELETE /api/sessions/{sessionId}`

4. **Types** — Add `InterviewSession`, `SessionQuestion`, `CreateSessionInput`, `SessionFilters` to `src/types/`.

### Definition of Done
- Sessions can be created with all configuration fields.
- Sessions can be listed and filtered by company/stage.
- Session detail returns questions array.
- Sessions can be deleted (cascades to questions).
- Both SQLite and Supabase adapters pass the same test cases.

---

## Phase 3: Simulation Config UI & Session Start

**Goal:** User can click "Simulate Interview" on a roadmap stage, configure the session, and create it.

### Tasks

1. **SimulationConfigModal** — Modal component with:
   - Pre-filled context (company name, position, seniority, stage type, prep notes) shown as read-only context
   - Number of questions input (slider or number input, range 3-15, default 5)
   - Interviewer persona text input with suggested presets (dropdown + custom)
   - Difficulty selector (easy / medium / hard)
   - Focus areas multi-select or tag input
   - Feedback mode toggle (immediate vs. full simulation)
   - "Start Session" button

2. **Roadmap stage integration** — Add "Simulate Interview" button to each stage card in the existing roadmap UI. Button disabled if no AI settings configured (with tooltip pointing to settings).

3. **Session creation flow** — On "Start Session":
   - POST to `/api/sessions` to create the session
   - Navigate to `/session/{sessionId}` (new page) or open the interview session view

4. **Session page scaffold** — Create `src/app/session/[sessionId]/page.tsx` as the container for the live interview experience. For now, just display session config and a "Begin Interview" button.

### Definition of Done
- "Simulate Interview" button appears on roadmap stages.
- Config modal opens with correct pre-filled context.
- Session is created in DB on "Start Session".
- User lands on session page with correct data loaded.
- Guard: redirect to settings if no AI key configured.

---

## Phase 4: Core Interview Loop (Text-Only)

**Goal:** The AI asks questions and the user answers via text input. Full interview flow works without voice.

### Tasks

1. **Prompt builder** — Create `src/lib/interview/prompts.ts`:
   - `buildInterviewSystemPrompt(session, company, stage)` — Generates the system prompt using the template from the spec
   - `buildDebriefSystemPrompt(session, questions)` — Generates the debrief prompt
   - `buildFeedbackPrompt(question, answer)` — Prompt for immediate feedback

2. **Session flow API routes:**
   - `POST /api/sessions/{sessionId}/start` — Calls LLM to generate first question, transitions to `in_progress`
   - `POST /api/sessions/{sessionId}/answer` — Saves answer, calls LLM for feedback (immediate mode) or next question (full mode)
   - `POST /api/sessions/{sessionId}/complete` — End early, trigger debrief
   - `POST /api/sessions/{sessionId}/cancel` — Cancel without debrief

3. **LLM proxy route** — `POST /api/llm/chat` with streaming support (SSE).

4. **InterviewSession component** — The live interview UI:
   - Display current question text
   - Text area for typing answers
   - "Submit Answer" button
   - Question counter (e.g., "Question 2 of 5")
   - Timer per question
   - In immediate mode: show FeedbackCard after each answer, with "Next Question" or "Re-attempt" buttons
   - In full mode: auto-advance to next question after submit
   - "End Interview" button to complete early
   - Session complete state → navigate to debrief

5. **Conversation state management** — Maintain the full message history (system + Q&A pairs) on the server side (stored in session or built from `session_questions`), so each LLM call includes full context.

### Definition of Done
- User can go through a full interview session via text.
- AI generates contextually relevant questions based on company/stage/role.
- Immediate feedback mode works (score + feedback after each question).
- Full simulation mode works (all questions, then complete).
- Early completion works.
- Cancellation works.
- Full transcript is persisted in DB.

---

## Phase 5: Voice Integration

**Goal:** User can speak answers and hear questions read aloud.

### Tasks

1. **VoiceControls component** — Microphone toggle, push-to-talk button, volume control, TTS on/off toggle.

2. **Browser STT hook** — `src/hooks/useSpeechRecognition.ts`:
   - Wraps `webkitSpeechRecognition` / `SpeechRecognition`
   - Handles interim and final results
   - Populates the answer text area in real-time
   - Handles errors and browser compatibility

3. **Browser TTS hook** — `src/hooks/useSpeechSynthesis.ts`:
   - Wraps `SpeechSynthesis` API
   - Voice selection
   - Speak question text when a new question arrives
   - Cancel on user interrupt

4. **Cloud STT integration** (optional path):
   - `POST /api/voice/stt` route — accepts audio blob, proxies to configured STT provider
   - Client-side: `MediaRecorder` → blob → POST to route
   - Fallback to browser STT if no cloud STT configured

5. **Cloud TTS integration** (optional path):
   - `POST /api/voice/tts` route — accepts text, returns audio buffer from configured TTS provider
   - Client-side: fetch audio → `Audio` playback
   - Fallback to browser TTS if no cloud TTS configured

6. **Voice mode in InterviewSession** — Toggle between text-only and voice mode. In voice mode:
   - Mic auto-activates (or push-to-talk based on setting)
   - Answer text area shows real-time transcript (editable before submit)
   - Questions are spoken aloud via TTS
   - Visual states: listening, processing, AI speaking
   - "Finish speaking" button to manually end STT capture

7. **AI Settings extension** — Add TTS/STT provider config fields to the AISettingsModal (provider, API key, voice selection).

### Definition of Done
- User can complete an interview session entirely by voice (browser APIs).
- Real-time transcript appears as user speaks.
- Questions are read aloud.
- Text fallback works seamlessly.
- Cloud TTS/STT works when configured (ElevenLabs, OpenAI, Deepgram).
- Smooth transitions between listening → processing → AI speaking states.

---

## Phase 6: Debrief & Session History

**Goal:** Post-session debrief is generated and displayed. Users can browse past sessions.

### Tasks

1. **Debrief generation** — `POST /api/sessions/{sessionId}/debrief`:
   - Collects full transcript from session questions
   - Builds debrief prompt with all context
   - Calls LLM for structured debrief
   - Parses response into: overall_score, summary, strengths, improvements, resources, per-question feedback
   - Persists debrief data on the session record
   - Auto-triggered on session completion (from Phase 4 complete flow)

2. **SessionDebrief component:**
   - Overall score with visual indicator (color-coded gauge or badge)
   - Summary narrative paragraph
   - Strengths list (green)
   - Improvements list (amber/red)
   - Suggested resources with links where applicable
   - Expandable per-question breakdown: question → answer transcript → score → feedback
   - "Regenerate Debrief" button (re-calls the LLM)
   - Navigation back to company detail

3. **SessionHistory component:**
   - List view of past sessions for a company or stage
   - Each row: date, score badge, feedback mode, question count, duration
   - Click to expand full debrief inline or navigate to debrief page
   - Score trend mini-chart (sparkline) if 3+ sessions exist

4. **CompanyDetailModal integration:**
   - Add "Simulations" tab to the existing company detail modal
   - Shows SessionHistory filtered by company
   - Quick link to start a new simulation for any stage

5. **Debrief page route** — `src/app/session/[sessionId]/debrief/page.tsx` as a standalone page for the full debrief view.

### Definition of Done
- Debrief is automatically generated on session completion.
- Debrief displays all required sections (score, strengths, improvements, resources, per-question).
- Session history shows in company detail modal.
- Score trend is visible when multiple sessions exist.
- Debrief can be regenerated.
- User can navigate from company → sessions → debrief seamlessly.

---

## Phase 7: Polish & Edge Cases

**Goal:** Production-quality UX, error handling, and performance.

### Tasks

1. **Error handling:**
   - LLM provider rate limiting → show user-friendly message with retry
   - Network disconnection during session → auto-save progress, allow resume
   - STT/TTS browser not supported → graceful fallback with clear messaging
   - Invalid/expired API key mid-session → prompt to update settings

2. **Loading states & skeleton UIs** — For all async operations: session start, question generation, feedback generation, debrief generation.

3. **Session resume** — If user navigates away during an `in_progress` session, allow resuming from where they left off (last unanswered question).

4. **Accessibility:**
   - Keyboard navigation for all interview controls
   - ARIA labels for voice state indicators
   - Screen reader announcements for new questions and feedback
   - High contrast for score indicators

5. **Responsive design** — Session UI works on tablet/mobile (important for practicing on the go).

6. **Performance:**
   - Streaming LLM responses so questions/feedback appear progressively
   - Debounced STT transcript updates
   - Lazy load session history

7. **Export options:**
   - Export debrief as Markdown
   - Copy debrief to clipboard

8. **Empty states & onboarding:**
   - First-time user flow: prompt to configure AI settings before first simulation
   - Empty session history state with CTA
   - Tooltips on simulation config options

### Definition of Done
- No unhandled errors during normal usage flows.
- Session can be resumed after accidental navigation.
- UI is responsive on mobile.
- All loading states have proper visual feedback.
- Export works.
- First-time user experience is guided.

---

## Phase Summary

| Phase | Feature | Depends On | Estimated Complexity |
|-------|---------|------------|---------------------|
| 1 | AI Settings & LLM Providers | — | Medium |
| 2 | Session Data Model & CRUD | — | Low-Medium |
| 3 | Simulation Config UI | Phase 1, 2 | Medium |
| 4 | Core Interview Loop (Text) | Phase 1, 2, 3 | High |
| 5 | Voice Integration | Phase 4 | High |
| 6 | Debrief & History | Phase 4 | Medium-High |
| 7 | Polish & Edge Cases | Phase 1–6 | Medium |

> **Phases 1 and 2 can be developed in parallel** since they have no dependencies on each other. Phase 5 and Phase 6 can also be developed in parallel once Phase 4 is complete.
