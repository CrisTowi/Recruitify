# Interview Simulator — API Spec

All routes follow the existing Recruitify pattern: Next.js App Router API routes under `src/app/api/`. Authentication handled by the existing auth middleware (Supabase mode) or bypassed (SQLite single-user mode). All routes use the `DbAdapter` interface and work with both storage backends.

---

## AI Settings

### `GET /api/ai-settings`

Retrieve the current user's LLM and voice provider configuration.

**Response `200`:**
```json
{
  "id": "uuid",
  "llm_provider": "openai",
  "llm_model": "gpt-4o",
  "has_llm_key": true,
  "tts_provider": "browser",
  "has_tts_key": false,
  "tts_voice_id": null,
  "stt_provider": "browser",
  "has_stt_key": false,
  "created_at": "2026-03-21T00:00:00Z",
  "updated_at": "2026-03-21T00:00:00Z"
}
```

> Note: API keys are NEVER returned to the client. Only `has_*_key: boolean` flags.

**Response `404`:** No settings configured yet.

---

### `PUT /api/ai-settings`

Create or update AI settings.

**Request body:**
```json
{
  "llm_provider": "anthropic",
  "llm_model": "claude-sonnet-4-20250514",
  "llm_api_key": "sk-ant-...",
  "tts_provider": "elevenlabs",
  "tts_api_key": "el-...",
  "tts_voice_id": "voice_abc123",
  "stt_provider": "browser",
  "stt_api_key": null
}
```

- `llm_api_key` is encrypted before storage. If omitted or `null`, the existing key is preserved.
- Same pattern for `tts_api_key` and `stt_api_key`.

**Response `200`:** Updated settings object (same shape as GET, no keys exposed).

---

### `POST /api/ai-settings/test`

Test the configured LLM connection with a lightweight request.

**Request body:**
```json
{
  "llm_provider": "openai",
  "llm_model": "gpt-4o",
  "llm_api_key": "sk-..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "model": "gpt-4o",
  "latency_ms": 842
}
```

**Response `400`:**
```json
{
  "success": false,
  "error": "Invalid API key or model not accessible"
}
```

---

## Interview Sessions

### `POST /api/sessions`

Create a new interview simulation session.

**Request body:**
```json
{
  "company_id": "uuid",
  "stage_id": "uuid",
  "feedback_mode": "immediate",
  "num_questions": 5,
  "interviewer_persona": "Senior engineering manager, direct but friendly",
  "difficulty": "medium",
  "focus_areas": ["system design", "behavioral leadership"]
}
```

**Response `201`:**
```json
{
  "id": "session-uuid",
  "company_id": "uuid",
  "stage_id": "uuid",
  "status": "configuring",
  "feedback_mode": "immediate",
  "num_questions": 5,
  "interviewer_persona": "Senior engineering manager, direct but friendly",
  "difficulty": "medium",
  "focus_areas": ["system design", "behavioral leadership"],
  "created_at": "2026-03-21T10:00:00Z"
}
```

**Response `400`:** Missing required fields or invalid values.
**Response `403`:** No AI settings configured (no API key).

---

### `GET /api/sessions?company_id={id}&stage_id={id}`

List sessions, optionally filtered by company and/or stage.

**Query params:**
- `company_id` (optional) — Filter by company
- `stage_id` (optional) — Filter by roadmap stage
- `status` (optional) — Filter by status
- `limit` (optional, default 20) — Pagination limit
- `offset` (optional, default 0) — Pagination offset

**Response `200`:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "company_id": "uuid",
      "stage_id": "uuid",
      "status": "completed",
      "feedback_mode": "immediate",
      "num_questions": 5,
      "difficulty": "medium",
      "overall_score": 7.4,
      "started_at": "2026-03-21T10:00:00Z",
      "completed_at": "2026-03-21T10:35:00Z",
      "created_at": "2026-03-21T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

### `GET /api/sessions/{sessionId}`

Get a single session with full debrief data.

**Response `200`:**
```json
{
  "id": "session-uuid",
  "company_id": "uuid",
  "stage_id": "uuid",
  "status": "completed",
  "feedback_mode": "immediate",
  "num_questions": 5,
  "interviewer_persona": "...",
  "difficulty": "medium",
  "focus_areas": ["system design"],
  "overall_score": 7.4,
  "debrief_summary": "Strong performance on system design questions...",
  "debrief_strengths": ["Clear communication", "Good trade-off analysis"],
  "debrief_improvements": ["Could go deeper on scalability", "Time management"],
  "debrief_resources": ["Designing Data-Intensive Applications", "System Design Interview by Alex Xu"],
  "started_at": "2026-03-21T10:00:00Z",
  "completed_at": "2026-03-21T10:35:00Z",
  "questions": [
    {
      "id": "q-uuid",
      "question_number": 1,
      "question_text": "Tell me about a time you led a technical migration...",
      "answer_transcript": "In my previous role at...",
      "score": 8.0,
      "feedback_strengths": "Great use of the STAR method...",
      "feedback_improvements": "Could quantify impact more...",
      "feedback_suggested_answer": null,
      "duration_seconds": 180
    }
  ]
}
```

---

### `DELETE /api/sessions/{sessionId}`

Delete a session and all its questions.

**Response `204`:** Session deleted.
**Response `404`:** Session not found.

---

## Session Flow (Live Interview)

### `POST /api/sessions/{sessionId}/start`

Transition session from `configuring` to `in_progress`. Generates the first question.

**Response `200`:**
```json
{
  "status": "in_progress",
  "started_at": "2026-03-21T10:00:00Z",
  "current_question": {
    "id": "q-uuid",
    "question_number": 1,
    "question_text": "Let's start. Tell me about yourself and why you're interested in this role at {company}."
  }
}
```

---

### `POST /api/sessions/{sessionId}/answer`

Submit an answer for the current question. In immediate mode, returns feedback. In full simulation mode, returns the next question.

**Request body:**
```json
{
  "question_id": "q-uuid",
  "answer_transcript": "In my previous role, I led a team of 5 engineers...",
  "duration_seconds": 145
}
```

**Response `200` (immediate feedback mode):**
```json
{
  "feedback": {
    "score": 7.5,
    "strengths": "Good structure, mentioned specific metrics...",
    "improvements": "Could elaborate more on the technical challenges...",
    "suggested_answer": "A stronger answer might start with..."
  },
  "next_question": {
    "id": "q-uuid-2",
    "question_number": 2,
    "question_text": "Describe a system you designed that had to handle..."
  },
  "is_last_question": false
}
```

**Response `200` (full simulation mode):**
```json
{
  "next_question": {
    "id": "q-uuid-2",
    "question_number": 2,
    "question_text": "Describe a system you designed that had to handle..."
  },
  "is_last_question": false
}
```

When `is_last_question` was `true` on the previous response and this is the final answer:

**Response `200` (session complete):**
```json
{
  "session_complete": true,
  "redirect_to_debrief": true
}
```

---

### `POST /api/sessions/{sessionId}/complete`

Manually end the session early. Triggers debrief generation for questions answered so far.

**Response `200`:**
```json
{
  "status": "completed",
  "completed_at": "2026-03-21T10:35:00Z",
  "questions_answered": 3,
  "questions_total": 5,
  "redirect_to_debrief": true
}
```

---

### `POST /api/sessions/{sessionId}/cancel`

Cancel an in-progress session without generating a debrief.

**Response `200`:**
```json
{
  "status": "cancelled"
}
```

---

## Debrief

### `POST /api/sessions/{sessionId}/debrief`

Generate (or regenerate) the debrief for a completed session. This makes an LLM call with the full transcript.

**Response `200`:**
```json
{
  "overall_score": 7.4,
  "summary": "Strong performance overall with particularly good...",
  "strengths": ["Clear communication style", "Good use of examples"],
  "improvements": ["Deeper technical depth needed", "Time management on longer questions"],
  "resources": ["Book: Cracking the Coding Interview", "Practice: LeetCode medium-hard"],
  "per_question": [
    {
      "question_number": 1,
      "score": 8.0,
      "strengths": "...",
      "improvements": "..."
    }
  ]
}
```

---

## Voice Proxy Routes

These routes proxy cloud TTS/STT calls so API keys stay server-side.

### `POST /api/voice/tts`

Convert text to speech using the configured cloud TTS provider.

**Request body:**
```json
{
  "text": "Tell me about a time you had to make a difficult technical decision.",
  "voice_id": "optional-override"
}
```

**Response `200`:** Audio binary (`Content-Type: audio/mpeg` or `audio/wav`).

**Response `400`:** TTS not configured or provider error.

---

### `POST /api/voice/stt`

Convert audio to text using the configured cloud STT provider.

**Request body:** `multipart/form-data` with audio file.

**Response `200`:**
```json
{
  "transcript": "In my previous role at the company...",
  "confidence": 0.95
}
```

---

## LLM Proxy Route

### `POST /api/llm/chat`

General-purpose LLM proxy. Used internally by session routes but also available for future extensibility.

**Request body:**
```json
{
  "messages": [
    { "role": "system", "content": "You are an interviewer..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

**Response `200` (non-streaming):**
```json
{
  "content": "That's an interesting background. Let me ask you...",
  "usage": {
    "input_tokens": 450,
    "output_tokens": 120
  }
}
```

**Response `200` (streaming, `stream: true`):**
Server-Sent Events stream:
```
data: {"type": "chunk", "content": "That's"}
data: {"type": "chunk", "content": " an interesting"}
data: {"type": "done", "usage": {"input_tokens": 450, "output_tokens": 120}}
```

---

## Provider Model Lists

### `GET /api/llm/models?provider={provider}`

Return available models for a given provider. Used by the settings UI to populate the model dropdown.

**Response `200`:**
```json
{
  "provider": "openai",
  "models": [
    { "id": "gpt-4o", "name": "GPT-4o", "context_window": 128000 },
    { "id": "gpt-4o-mini", "name": "GPT-4o Mini", "context_window": 128000 },
    { "id": "o3-mini", "name": "o3-mini", "context_window": 200000 }
  ]
}
```

> Note: This is a static/hardcoded list per provider, updated with app releases. OpenRouter models can optionally be fetched live from their API.

---

## DbAdapter Interface Extensions

New methods added to the existing `DbAdapter` interface:

```typescript
interface DbAdapter {
  // ... existing methods ...

  // AI Settings
  getAISettings(userId?: string): Promise<AISettings | null>;
  upsertAISettings(userId: string | null, settings: AISettingsInput): Promise<AISettings>;

  // Sessions
  createSession(session: CreateSessionInput): Promise<InterviewSession>;
  getSession(sessionId: string): Promise<InterviewSession | null>;
  getSessionWithQuestions(sessionId: string): Promise<InterviewSessionFull | null>;
  listSessions(filters: SessionFilters): Promise<{ sessions: InterviewSession[]; total: number }>;
  updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession>;
  deleteSession(sessionId: string): Promise<void>;

  // Session Questions
  createQuestion(question: CreateQuestionInput): Promise<SessionQuestion>;
  updateQuestion(questionId: string, updates: Partial<SessionQuestion>): Promise<SessionQuestion>;
  getSessionQuestions(sessionId: string): Promise<SessionQuestion[]>;
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_AI_SETTINGS` | 403 | User has not configured AI settings |
| `INVALID_API_KEY` | 400 | LLM provider rejected the API key |
| `PROVIDER_ERROR` | 502 | Upstream LLM/TTS/STT provider returned an error |
| `SESSION_NOT_FOUND` | 404 | Session ID does not exist |
| `INVALID_SESSION_STATE` | 409 | Action not allowed in current session state |
| `RATE_LIMITED` | 429 | Too many requests to proxy routes |
| `ENCRYPTION_ERROR` | 500 | Failed to encrypt/decrypt API key |
