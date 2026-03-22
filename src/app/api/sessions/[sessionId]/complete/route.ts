import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createLLMClient } from '@/lib/llm/factory';
import { buildDebriefSystemPrompt, buildConversationHistory } from '@/lib/interview/prompts';
import type { ChatMessage } from '@/lib/llm/types';

type Ctx = { params: Promise<{ sessionId: string }> };

interface DebriefPerQuestion {
  question_number: number;
  score: number;
  strengths: string;
  improvements: string;
}

interface DebriefJson {
  overall_score?: number;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  resources?: string[];
  per_question?: DebriefPerQuestion[];
}

function parseDebriefJson(raw: string): DebriefJson {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]) as DebriefJson;
  } catch {
    return {};
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { sessionId } = await params;

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

    const questions = await db.getSessionQuestions(sessionId);
    const answeredCount = questions.filter((question) => question.answer_transcript !== null).length;

    const updatedSession = await db.updateSession(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Auto-generate debrief — run in background, don't block the response
    void (async () => {
      try {
        const answeredQuestions = questions.filter((question) => question.answer_transcript !== null);
        if (answeredQuestions.length === 0) return;

        const [company, stage, aiKeys, aiSettings] = await Promise.all([
          db.getCompany(session.company_id),
          db.getStage(session.stage_id),
          db.getDecryptedAIKeys(),
          db.getAISettings(),
        ]);

        if (!company || !stage || !aiKeys?.llm_api_key || !aiSettings) return;

        const llm = createLLMClient(aiSettings.llm_provider, aiKeys.llm_api_key, aiSettings.llm_model);
        const systemPrompt = buildDebriefSystemPrompt(updatedSession, company, stage);
        const conversationHistory = buildConversationHistory(answeredQuestions);

        const transcriptSummary = answeredQuestions
          .map((question) => `Q${question.question_number}: ${question.question_text}\nA: ${question.answer_transcript}`)
          .join('\n\n');

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: `Please provide the debrief for this interview session.\n\nFull transcript:\n${transcriptSummary}` },
        ];

        const response = await llm.chat(messages, { temperature: 0.3, maxTokens: 2048 });
        const debrief = parseDebriefJson(response.content);

        await db.updateSession(sessionId, {
          overall_score: debrief.overall_score ?? null,
          debrief_summary: debrief.summary ?? null,
          debrief_strengths: debrief.strengths ?? [],
          debrief_improvements: debrief.improvements ?? [],
          debrief_resources: debrief.resources ?? [],
        });

        if (debrief.per_question?.length) {
          await Promise.all(
            debrief.per_question.map((perQ) => {
              const question = answeredQuestions.find((answered) => answered.question_number === perQ.question_number);
              if (!question) return Promise.resolve();
              return db.updateQuestion(question.id, {
                score: perQ.score ?? null,
                feedback_strengths: perQ.strengths ?? null,
                feedback_improvements: perQ.improvements ?? null,
              });
            }),
          );
        }
      } catch {
        // Debrief generation failure is non-fatal — user can regenerate from the debrief page
      }
    })();

    return NextResponse.json({
      status: updatedSession.status,
      completed_at: updatedSession.completed_at,
      questions_answered: answeredCount,
      questions_total: session.num_questions,
      redirect_to_debrief: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
