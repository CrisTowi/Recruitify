import type { FeedbackData } from '@/components/FeedbackCard/FeedbackCard';

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
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
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
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<AnswerResponse>;
}

export async function completeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

export async function cancelSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}
