import type { FeedbackMode, Difficulty, InterviewSession } from '@/types';

export const PERSONA_PRESETS = [
  { label: 'Engineering manager', value: 'Senior engineering manager, direct but friendly' },
  { label: 'Technical interviewer', value: 'Experienced senior software engineer, focused on technical depth' },
  { label: 'HR / recruiter', value: 'Friendly HR recruiter, focused on culture fit and behavioral questions' },
  { label: 'Panel interview', value: 'Panel of two senior engineers, thorough and methodical' },
  { label: 'Startup founder', value: 'Startup founder, fast-paced and looking for ownership mindset' },
  { label: 'Custom', value: '' },
];

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Straightforward questions, forgiving tone' },
  { value: 'medium', label: 'Medium', description: 'Realistic interview depth and pace' },
  { value: 'hard', label: 'Hard', description: 'Challenging follow-ups, high bar' },
];

export const FEEDBACK_MODE_OPTIONS: { value: FeedbackMode; label: string; description: string }[] = [
  { value: 'immediate', label: 'Immediate feedback', description: 'Score and tips after each answer' },
  { value: 'full_simulation', label: 'Full simulation', description: 'All feedback at the end, like a real interview' },
];

export const FOCUS_AREA_SUGGESTIONS = [
  'Behavioral / leadership',
  'System design',
  'Technical depth',
  'Problem solving',
  'Communication',
  'Culture fit',
  'Past experience',
  'Coding',
];

export async function fetchActiveSession(): Promise<InterviewSession | null> {
  const res = await fetch('/api/sessions?status=in_progress&limit=1');
  if (!res.ok) return null;
  const data = await res.json() as { sessions: InterviewSession[]; total: number };
  return data.sessions[0] ?? null;
}

export async function cancelSessionById(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

export async function createSession(payload: {
  company_id: string;
  stage_id: string;
  feedback_mode: FeedbackMode;
  num_questions: number;
  interviewer_persona: string | null;
  difficulty: Difficulty;
  focus_areas: string[];
}) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<{ id: string }>;
}
