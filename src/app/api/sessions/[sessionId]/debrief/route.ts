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

    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Session must be completed before generating a debrief', code: 'INVALID_SESSION_STATE' },
        { status: 409 },
      );
    }

    const [company, stage, questions, aiKeys, aiSettings] = await Promise.all([
      db.getCompany(session.company_id),
      db.getStage(session.stage_id),
      db.getSessionQuestions(sessionId),
      db.getDecryptedAIKeys(),
      db.getAISettings(),
    ]);

    if (!company || !stage) {
      return NextResponse.json({ error: 'Company or stage not found' }, { status: 404 });
    }

    if (!aiKeys?.llm_api_key || !aiSettings) {
      return NextResponse.json({ error: 'No LLM API key configured', code: 'NO_AI_SETTINGS' }, { status: 403 });
    }

    const answeredQuestions = questions.filter((question) => question.answer_transcript !== null);

    if (answeredQuestions.length === 0) {
      return NextResponse.json({ error: 'No answered questions to debrief' }, { status: 400 });
    }

    const llm = createLLMClient(aiSettings.llm_provider, aiKeys.llm_api_key, aiSettings.llm_model);
    const systemPrompt = buildDebriefSystemPrompt(session, company, stage);
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

    // Persist debrief data to the session
    const updatedSession = await db.updateSession(sessionId, {
      overall_score: debrief.overall_score ?? null,
      debrief_summary: debrief.summary ?? null,
      debrief_strengths: debrief.strengths ?? [],
      debrief_improvements: debrief.improvements ?? [],
      debrief_resources: debrief.resources ?? [],
    });

    // Persist per-question feedback scores
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

    return NextResponse.json({
      overall_score: updatedSession.overall_score,
      summary: updatedSession.debrief_summary,
      strengths: updatedSession.debrief_strengths,
      improvements: updatedSession.debrief_improvements,
      resources: updatedSession.debrief_resources,
      per_question: debrief.per_question ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
