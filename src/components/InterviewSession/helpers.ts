import type { FeedbackData } from '@/components/FeedbackCard/FeedbackCard';
import type { AISettings, TTSProvider } from '@/types';

// ── Error classification ──────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ErrorKind = 'rate_limit' | 'network' | 'invalid_key' | 'fatal';

export interface ClassifiedError {
  kind: ErrorKind;
  retryable: boolean;
  message: string;
}

export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return { kind: 'rate_limit', retryable: true, message: 'Rate limit reached. Wait a moment and try again.' };
    }
    if (err.status === 403 || err.code === 'NO_AI_SETTINGS') {
      return { kind: 'invalid_key', retryable: false, message: err.message || 'AI settings not configured.' };
    }
    return { kind: 'fatal', retryable: false, message: err.message };
  }
  if (err instanceof TypeError) {
    return { kind: 'network', retryable: true, message: 'Network error. Check your connection and try again.' };
  }
  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return { kind: 'fatal', retryable: false, message };
}

export interface CurrentQuestion {
  id: string;
  question_number: number;
  question_text: string;
}

export interface StartResponse {
  status: string;
  started_at: string;
  current_question: CurrentQuestion;
}

export interface AnswerResponse {
  feedback?: FeedbackData;
  next_question?: CurrentQuestion;
  is_last_question?: boolean;
  session_complete?: boolean;
  redirect_to_debrief?: boolean;
}

export async function startSession(sessionId: string): Promise<StartResponse> {
  const res = await fetch(`/api/sessions/${sessionId}/start`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string; code?: string };
    throw new ApiError(json.error ?? `HTTP ${res.status}`, res.status, json.code);
  }
  return res.json() as Promise<StartResponse>;
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  answerTranscript: string,
  durationSeconds: number,
): Promise<AnswerResponse> {
  const res = await fetch(`/api/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: questionId,
      answer_transcript: answerTranscript,
      duration_seconds: durationSeconds,
    }),
  });
  if (!res.ok) {
    const json = await res.json() as { error?: string; code?: string };
    throw new ApiError(json.error ?? `HTTP ${res.status}`, res.status, json.code);
  }
  return res.json() as Promise<AnswerResponse>;
}

export async function completeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string; code?: string };
    throw new ApiError(json.error ?? `HTTP ${res.status}`, res.status, json.code);
  }
}

export async function cancelSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string; code?: string };
    throw new ApiError(json.error ?? `HTTP ${res.status}`, res.status, json.code);
  }
}

export async function fetchSessionAISettings(): Promise<AISettings | null> {
  try {
    const res = await fetch('/api/ai-settings');
    if (!res.ok) return null;
    return res.json() as Promise<AISettings>;
  } catch {
    return null;
  }
}

export function isCloudTtsProvider(provider: TTSProvider | null | undefined): boolean {
  return provider === 'deepgram';
}

export function isCloudSttProvider(provider: import('@/types').STTProvider | null | undefined): boolean {
  return provider === 'deepgram';
}

export async function speakWithCloudTts(text: string, voiceId?: string | null): Promise<HTMLAudioElement> {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId ?? undefined }),
  });
  if (!res.ok) throw new Error(`TTS request failed: HTTP ${res.status}`);
  const audioBlob = await res.blob();
  const audio = new Audio(URL.createObjectURL(audioBlob));
  return audio;
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}
