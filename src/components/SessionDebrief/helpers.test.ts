import { describe, it, expect } from 'vitest';
import { scoreColorClass, formatScoreLabel, buildDebriefMarkdown } from './helpers';
import type { InterviewSessionFull, SessionQuestion } from '@/types';

describe('scoreColorClass', () => {
  const styles = { scoreHigh: 'high', scoreMid: 'mid', scoreLow: 'low' };

  it('returns empty string for null score', () => {
    expect(scoreColorClass(null, styles)).toBe('');
  });

  it('returns scoreHigh for scores 8 and above', () => {
    expect(scoreColorClass(8, styles)).toBe('high');
    expect(scoreColorClass(10, styles)).toBe('high');
  });

  it('returns scoreMid for scores between 5 and 7', () => {
    expect(scoreColorClass(5, styles)).toBe('mid');
    expect(scoreColorClass(7, styles)).toBe('mid');
  });

  it('returns scoreLow for scores below 5', () => {
    expect(scoreColorClass(4, styles)).toBe('low');
    expect(scoreColorClass(1, styles)).toBe('low');
  });
});

describe('formatScoreLabel', () => {
  it('returns an em dash for null scores', () => {
    expect(formatScoreLabel(null)).toBe('—');
  });

  it('formats a whole number with one decimal', () => {
    expect(formatScoreLabel(8)).toBe('8.0/10');
  });

  it('formats a decimal score correctly', () => {
    expect(formatScoreLabel(7.5)).toBe('7.5/10');
  });
});

const makeQuestion = (overrides: Partial<SessionQuestion> = {}): SessionQuestion => ({
  id: 'q-1',
  session_id: 'session-1',
  question_number: 1,
  question_text: 'Tell me about yourself',
  answer_transcript: 'I have 5 years of experience',
  score: 8,
  feedback_strengths: 'Clear and concise',
  feedback_improvements: 'Add more metrics',
  feedback_suggested_answer: 'Start with impact',
  duration_seconds: 60,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeSession = (overrides: Partial<InterviewSessionFull> = {}): InterviewSessionFull => ({
  id: 'session-1',
  user_id: null,
  company_id: 'company-1',
  stage_id: 'stage-1',
  status: 'completed',
  feedback_mode: 'full_simulation',
  num_questions: 3,
  interviewer_persona: null,
  difficulty: 'medium',
  focus_areas: [],
  is_dry_run: false,
  dry_run_context: null,
  overall_score: 7.5,
  debrief_summary: 'Solid performance overall.',
  debrief_strengths: ['Clear communication', 'Good examples'],
  debrief_improvements: ['More detail on systems', 'Ask clarifying questions'],
  debrief_resources: ['System Design Primer', 'DDIA book'],
  debrief_verdict: 'pass',
  debrief_interviewer_note: 'Would move forward.',
  started_at: '2026-01-01T09:00:00Z',
  completed_at: '2026-01-01T09:30:00Z',
  created_at: '2026-01-01T00:00:00Z',
  questions: [makeQuestion()],
  ...overrides,
});

describe('buildDebriefMarkdown', () => {
  it('starts with the session debrief heading', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('# Session Debrief');
  });

  it('includes the overall score', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('7.5/10');
  });

  it('includes the summary section', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('## Summary');
    expect(md).toContain('Solid performance overall.');
  });

  it('includes the strengths section', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('## Strengths');
    expect(md).toContain('- Clear communication');
    expect(md).toContain('- Good examples');
  });

  it('includes the improvements section', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('## Areas to Improve');
    expect(md).toContain('- More detail on systems');
  });

  it('includes the resources section', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('## Suggested Resources');
    expect(md).toContain('- System Design Primer');
  });

  it('includes the question breakdown', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('## Question Breakdown');
    expect(md).toContain('Tell me about yourself');
    expect(md).toContain('I have 5 years of experience');
  });

  it('includes per-question score in the heading', () => {
    const md = buildDebriefMarkdown(makeSession());
    expect(md).toContain('Q1 — 8.0/10');
  });

  it('omits the score line when overall_score is null', () => {
    const md = buildDebriefMarkdown(makeSession({ overall_score: null }));
    expect(md).not.toContain('Overall Score');
  });

  it('omits empty sections', () => {
    const session = makeSession({ debrief_strengths: [], debrief_improvements: [], debrief_resources: [] });
    const md = buildDebriefMarkdown(session);
    expect(md).not.toContain('## Strengths');
    expect(md).not.toContain('## Areas to Improve');
    expect(md).not.toContain('## Suggested Resources');
  });

  it('shows questions answered count', () => {
    const session = makeSession({
      num_questions: 3,
      questions: [
        makeQuestion({ answer_transcript: 'Answer 1' }),
        makeQuestion({ id: 'q-2', question_number: 2, answer_transcript: null }),
      ],
    });
    const md = buildDebriefMarkdown(session);
    expect(md).toContain('1 of 3');
  });
});
