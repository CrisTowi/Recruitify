# CLAUDE.md — Interview Simulator Feature

## Context

This document guides implementation of the Interview Simulator feature for Recruitify. Read this file first, then reference the spec documents for details:

- `INTERVIEW_SIM_SPEC.md` — Full feature specification, data model, architecture, user stories
- `INTERVIEW_SIM_API_SPEC.md` — All API routes, request/response schemas, error codes
- `INTERVIEW_SIM_PHASES.md` — Implementation phases with tasks and acceptance criteria

## Project Architecture

Recruitify is a **Next.js 14+ App Router** application with:
- **TypeScript** throughout
- **Dual storage backends:** SQLite (local, `better-sqlite3`) and Supabase (hosted). Controlled by `STORAGE_MODE` env var.
- **DbAdapter pattern:** All DB access goes through `src/lib/db/` adapters. Both backends implement the same interface.
- **Auth:** Optional Supabase magic-link auth gated by `SUPABASE_AUTH` env var. SQLite mode has no auth (single-user).
- **Styling:** CSS (existing project convention)
- **Testing:** Vitest

## Key Directories

```
src/
  app/api/          → API routes (Next.js route handlers)
  app/              → Pages (App Router)
  components/       → React components
  lib/db/           → DbAdapter interface + implementations
  lib/              → Shared utilities
  types/            → TypeScript type definitions
  hooks/            → Custom React hooks (create as needed)
supabase/
  migrations/       → Supabase SQL migrations (run in order)
```

## Implementation Rules

1. **Always implement for BOTH storage backends.** Every new DB method needs a SQLite implementation and a Supabase implementation. Test both.

2. **API keys never reach the client.** All LLM, TTS, and STT API calls happen in API routes. Keys are decrypted server-side only.

3. **Follow existing patterns.** Look at how `companies`, `roadmap_stages`, `timeline_events`, and `offers` are implemented for the CRUD pattern, API route structure, and component organization.

4. **LLM calls use the provider abstraction.** Never import a specific provider SDK directly in a route. Always go through `createLLMClient()` from `src/lib/llm/factory.ts`.

5. **Migrations are incremental.** Each new table gets its own migration file with a timestamp prefix. Supabase migrations go in `supabase/migrations/`. SQLite schema changes are handled in the adapter initialization.

6. **No new npm dependencies for LLM providers.** Use `fetch` directly against provider APIs. This keeps the bundle lean and avoids SDK version churn.

7. **Voice APIs are progressive enhancement.** The interview flow must work fully via text input. Voice is layered on top. Always check for browser API support before using.

8. **Streaming responses use SSE (Server-Sent Events).** For streaming LLM output in API routes, use the standard SSE pattern with `ReadableStream` and `TextEncoder`.

9. **Encryption uses Node.js `crypto` module.** AES-256-GCM with random IV. No external encryption libraries.

10. **JSON fields stored as TEXT.** For arrays like `focus_areas`, `debrief_strengths`, etc., store as JSON strings in TEXT columns. Parse/stringify at the adapter level.

## Environment Variables (New)

```env
ENCRYPTION_KEY=          # 32-byte hex string for AES-256-GCM (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

## LLM Provider API Patterns

- **OpenAI / OpenRouter:** `POST https://api.openai.com/v1/chat/completions` (OpenRouter uses `https://openrouter.ai/api/v1/chat/completions`)
- **Anthropic:** `POST https://api.anthropic.com/v1/messages` with `x-api-key` header and `anthropic-version` header
- **Gemini:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with API key as query param

## Testing Approach

- Unit tests for LLM client abstraction (mock fetch)
- Unit tests for encryption utility
- Unit tests for prompt builders
- Integration tests for session CRUD (both adapters)
- Component tests for critical UI flows (config modal, interview session)
- Manual testing for voice integration (browser APIs don't work in test environments)

## Phase Execution

Work through `INTERVIEW_SIM_PHASES.md` sequentially. Each phase has a "Definition of Done" checklist. Complete all items before moving to the next phase. Phases 1 and 2 can be parallelized. Phases 5 and 6 can be parallelized after Phase 4.
