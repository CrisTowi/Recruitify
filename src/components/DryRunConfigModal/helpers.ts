import type { FeedbackMode, Difficulty, InterviewSession } from '@/types';

export {
  PERSONA_PRESETS,
  DIFFICULTY_OPTIONS,
  FEEDBACK_MODE_OPTIONS,
  FOCUS_AREA_SUGGESTIONS,
} from '@/components/SimulationConfigModal/helpers';

export async function createDryRunSession(payload: {
  feedback_mode: FeedbackMode;
  num_questions: number;
  interviewer_persona: string | null;
  difficulty: Difficulty;
  focus_areas: string[];
  dry_run_context: string | null;
}): Promise<InterviewSession> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, is_dry_run: true }),
  });

  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<InterviewSession>;
}
