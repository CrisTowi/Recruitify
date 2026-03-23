import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createLLMClient } from '@/lib/llm/factory';
import {
  buildInterviewSystemPrompt,
  buildFeedbackMessages,
  buildConversationHistory,
} from '@/lib/interview/prompts';
import type { ChatMessage } from '@/lib/llm/types';

type Ctx = { params: Promise<{ sessionId: string }> };

interface AnswerBody {
  question_id: string;
  answer_transcript: string;
  duration_seconds?: number;
}

interface FeedbackJson {
  score?: number;
  strengths?: string;
  improvements?: string;
  suggested_answer?: string;
}

function parseFeedbackJson(raw: string): FeedbackJson {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]) as FeedbackJson;
  } catch {
    return {};
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { sessionId } = await params;

  let body: AnswerBody;
  try {
    body = await req.json() as AnswerBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { question_id, answer_transcript, duration_seconds } = body;

  if (!question_id || !answer_transcript) {
    return NextResponse.json({ error: 'question_id and answer_transcript are required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const session = await db.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Session is not in progress', code: 'INVALID_SESSION_STATE' },
        { status: 409 },
      );
    }

    // Save the answer to the current question
    const updatedQuestion = await db.updateQuestion(question_id, {
      answer_transcript,
      duration_seconds: duration_seconds ?? null,
    });

    const questions = await db.getSessionQuestions(sessionId);
    const answeredCount = questions.filter((question) => question.answer_transcript !== null).length;
    const isLastQuestion = answeredCount >= session.num_questions;

    const [company, stage, aiKeys, aiSettings] = await Promise.all([
      db.getCompany(session.company_id),
      db.getStage(session.stage_id),
      db.getDecryptedAIKeys(),
      db.getAISettings(),
    ]);

    if (!company || !stage || !aiKeys?.llm_api_key || !aiSettings) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const llm = createLLMClient(aiSettings.llm_provider, aiKeys.llm_api_key, aiSettings.llm_model);

    // Immediate feedback mode: generate feedback for this answer
    let feedback: FeedbackJson | null = null;
    if (session.feedback_mode === 'immediate') {
      const feedbackMessages = buildFeedbackMessages(updatedQuestion);
      const feedbackResponse = await llm.chat(feedbackMessages, { temperature: 0.3, maxTokens: 512 });
      feedback = parseFeedbackJson(feedbackResponse.content);

      // Persist feedback to question record
      await db.updateQuestion(question_id, {
        score: feedback.score ?? null,
        feedback_strengths: feedback.strengths ?? null,
        feedback_improvements: feedback.improvements ?? null,
        feedback_suggested_answer: feedback.suggested_answer ?? null,
      });
    }

    // If this was the last question, signal completion
    if (isLastQuestion) {
      return NextResponse.json({
        feedback: feedback ?? undefined,
        session_complete: true,
        redirect_to_debrief: true,
      });
    }

    // If a next question already exists (e.g. from a previous failed request), return it
    const existingUnanswered = questions.find((question) => question.answer_transcript === null);
    if (existingUnanswered) {
      return NextResponse.json({
        feedback: feedback ?? undefined,
        next_question: {
          id: existingUnanswered.id,
          question_number: existingUnanswered.question_number,
          question_text: existingUnanswered.question_text,
        },
        is_last_question: existingUnanswered.question_number >= session.num_questions,
      });
    }

    // Generate next question
    const systemPrompt = buildInterviewSystemPrompt(session, company, stage);
    const history = buildConversationHistory(questions);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    const nextQuestionResponse = await llm.chat(messages, { temperature: 0.7, maxTokens: 512 });
    const nextQuestionText = nextQuestionResponse.content.trim();

    const nextQuestionNumber = answeredCount + 1;
    const nextQuestion = await db.createQuestion({
      session_id: sessionId,
      question_number: nextQuestionNumber,
      question_text: nextQuestionText,
    });

    const nextIsLast = nextQuestionNumber >= session.num_questions;

    return NextResponse.json({
      feedback: feedback ?? undefined,
      next_question: {
        id: nextQuestion.id,
        question_number: nextQuestion.question_number,
        question_text: nextQuestion.question_text,
      },
      is_last_question: nextIsLast,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
