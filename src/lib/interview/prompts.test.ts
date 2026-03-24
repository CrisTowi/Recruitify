import { describe, it, expect } from 'vitest';
import {
  buildInterviewSystemPrompt,
  buildDebriefSystemPrompt,
  buildFeedbackMessages,
  buildConversationHistory,
} from './prompts';
import type { InterviewSession, Company, InterviewStage, SessionQuestion } from '@/types';

const baseSession: InterviewSession = {
  id: 'session-1',
  user_id: null,
  company_id: 'company-1',
  stage_id: 'stage-1',
  status: 'in_progress',
  feedback_mode: 'full_simulation',
  num_questions: 5,
  interviewer_persona: null,
  difficulty: 'medium',
  focus_areas: [],
  is_dry_run: false,
  dry_run_context: null,
  overall_score: null,
  debrief_summary: null,
  debrief_strengths: [],
  debrief_improvements: [],
  debrief_resources: [],
  debrief_verdict: null,
  debrief_interviewer_note: null,
  started_at: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

const baseCompany: Company = {
  id: 'company-1',
  name: 'Acme Corp',
  logo_url: null,
  status: 'Interviewing',
  interest_level: null,
  prep_notes: null,
  created_at: '2026-01-01T00:00:00Z',
};

const baseStage: InterviewStage = {
  id: 'stage-1',
  company_id: 'company-1',
  stage_name: 'System Design',
  is_completed: false,
  scheduled_date: null,
  order_index: 0,
  notes: null,
};

describe('buildInterviewSystemPrompt', () => {
  it('includes company and stage name for regular sessions', () => {
    const prompt = buildInterviewSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('System Design');
  });

  it('specifies the correct number of questions', () => {
    const prompt = buildInterviewSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('5');
  });

  it('uses default persona when none is set', () => {
    const prompt = buildInterviewSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('an experienced technical interviewer');
  });

  it('uses the custom persona when provided', () => {
    const session = { ...baseSession, interviewer_persona: 'a strict ex-FAANG engineer' };
    const prompt = buildInterviewSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('a strict ex-FAANG engineer');
  });

  it('lists provided focus areas', () => {
    const session = { ...baseSession, focus_areas: ['System design', 'Leadership'] };
    const prompt = buildInterviewSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('System design');
    expect(prompt).toContain('Leadership');
  });

  it('falls back to general competencies when focus areas are empty', () => {
    const prompt = buildInterviewSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('general competencies');
  });

  it('instructs to give immediate feedback in immediate mode', () => {
    const session = { ...baseSession, feedback_mode: 'immediate' as const };
    const prompt = buildInterviewSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('brief constructive feedback');
  });

  it('instructs to withhold feedback in full_simulation mode', () => {
    const prompt = buildInterviewSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('Do NOT provide feedback');
  });

  it('includes prep notes when present', () => {
    const company = { ...baseCompany, prep_notes: 'Focus on distributed systems' };
    const prompt = buildInterviewSystemPrompt(baseSession, company, baseStage);
    expect(prompt).toContain('Focus on distributed systems');
  });

  describe('dry-run mode', () => {
    const dryRunSession = { ...baseSession, is_dry_run: true };

    it('does not mention the company name', () => {
      const prompt = buildInterviewSystemPrompt(dryRunSession, baseCompany, baseStage);
      expect(prompt).not.toContain('Acme Corp');
    });

    it('uses generic context message when no dry_run_context is set', () => {
      const prompt = buildInterviewSystemPrompt(dryRunSession, baseCompany, baseStage);
      expect(prompt).toContain('No specific role or context was provided');
    });

    it('includes the dry_run_context when provided', () => {
      const session = { ...dryRunSession, dry_run_context: 'Senior Frontend Engineer at fintech' };
      const prompt = buildInterviewSystemPrompt(session, baseCompany, baseStage);
      expect(prompt).toContain('Senior Frontend Engineer at fintech');
    });
  });
});

describe('buildDebriefSystemPrompt', () => {
  it('produces a JSON-shaped prompt for regular sessions', () => {
    const prompt = buildDebriefSystemPrompt(baseSession, baseCompany, baseStage);
    expect(prompt).toContain('overall_score');
    expect(prompt).toContain('per_question');
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('System Design');
  });

  it('labels dry-run sessions as a practice interview', () => {
    const session = { ...baseSession, is_dry_run: true };
    const prompt = buildDebriefSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('practice interview');
    expect(prompt).not.toContain('Acme Corp');
  });

  it('includes dry_run_context in the description when provided', () => {
    const session = { ...baseSession, is_dry_run: true, dry_run_context: 'ML Engineer role' };
    const prompt = buildDebriefSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('ML Engineer role');
  });

  it('mentions the difficulty level', () => {
    const session = { ...baseSession, difficulty: 'hard' as const };
    const prompt = buildDebriefSystemPrompt(session, baseCompany, baseStage);
    expect(prompt).toContain('hard');
  });
});

describe('buildFeedbackMessages', () => {
  const question: SessionQuestion = {
    id: 'q-1',
    session_id: 'session-1',
    question_number: 1,
    question_text: 'Tell me about yourself',
    answer_transcript: 'I have 5 years of experience…',
    score: null,
    feedback_strengths: null,
    feedback_improvements: null,
    feedback_suggested_answer: null,
    duration_seconds: null,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('returns a single user message', () => {
    const messages = buildFeedbackMessages(question);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
  });

  it('includes the question text in the message', () => {
    const messages = buildFeedbackMessages(question);
    expect(messages[0].content).toContain('Tell me about yourself');
  });

  it('includes the answer transcript in the message', () => {
    const messages = buildFeedbackMessages(question);
    expect(messages[0].content).toContain('I have 5 years of experience…');
  });

  it('shows "(no answer provided)" when answer is null', () => {
    const unanswered = { ...question, answer_transcript: null };
    const messages = buildFeedbackMessages(unanswered);
    expect(messages[0].content).toContain('(no answer provided)');
  });
});

describe('buildConversationHistory', () => {
  it('returns empty array for no questions', () => {
    expect(buildConversationHistory([])).toEqual([]);
  });

  it('adds an assistant message for each question', () => {
    const questions: SessionQuestion[] = [
      {
        id: 'q-1',
        session_id: 'session-1',
        question_number: 1,
        question_text: 'Question one?',
        answer_transcript: 'Answer one',
        score: null,
        feedback_strengths: null,
        feedback_improvements: null,
        feedback_suggested_answer: null,
        duration_seconds: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const messages = buildConversationHistory(questions);
    expect(messages[0]).toEqual({ role: 'assistant', content: 'Question one?' });
    expect(messages[1]).toEqual({ role: 'user', content: 'Answer one' });
  });

  it('skips the user message when there is no answer', () => {
    const questions: SessionQuestion[] = [
      {
        id: 'q-1',
        session_id: 'session-1',
        question_number: 1,
        question_text: 'Unanswered?',
        answer_transcript: null,
        score: null,
        feedback_strengths: null,
        feedback_improvements: null,
        feedback_suggested_answer: null,
        duration_seconds: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const messages = buildConversationHistory(questions);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
  });

  it('interleaves assistant and user messages for multiple questions', () => {
    const questions: SessionQuestion[] = [1, 2].map((num) => ({
      id: `q-${num}`,
      session_id: 'session-1',
      question_number: num,
      question_text: `Q${num}?`,
      answer_transcript: `A${num}`,
      score: null,
      feedback_strengths: null,
      feedback_improvements: null,
      feedback_suggested_answer: null,
      duration_seconds: null,
      created_at: '2026-01-01T00:00:00Z',
    }));

    const messages = buildConversationHistory(questions);
    expect(messages).toHaveLength(4);
    expect(messages.map((msg) => msg.role)).toEqual(['assistant', 'user', 'assistant', 'user']);
  });
});
