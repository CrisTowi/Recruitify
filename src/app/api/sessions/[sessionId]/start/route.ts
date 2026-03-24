import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createLLMClient } from '@/lib/llm/factory';
import { buildInterviewSystemPrompt } from '@/lib/interview/prompts';
import type { ChatMessage } from '@/lib/llm/types';

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { sessionId } = await params;

  try {
    const db = await getDb(req);
    const session = await db.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    if (session.status !== 'configuring') {
      return NextResponse.json(
        { error: 'Session has already been started', code: 'INVALID_SESSION_STATE' },
        { status: 409 },
      );
    }

    const [company, stage, aiKeys] = await Promise.all([
      db.getCompany(session.company_id),
      db.getStage(session.stage_id),
      db.getDecryptedAIKeys(),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }
    if (!aiKeys?.llm_api_key) {
      return NextResponse.json({ error: 'No LLM API key configured', code: 'NO_AI_SETTINGS' }, { status: 403 });
    }

    const aiSettings = await db.getAISettings();
    if (!aiSettings) {
      return NextResponse.json({ error: 'No AI settings configured', code: 'NO_AI_SETTINGS' }, { status: 403 });
    }

    const llm = createLLMClient(aiSettings.llm_provider, aiKeys.llm_api_key, aiSettings.llm_model);
    const systemPrompt = buildInterviewSystemPrompt(session, company, stage);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Please begin.' },
    ];

    const response = await llm.chat(messages, { temperature: 0.7, maxTokens: 512 });
    const questionText = response.content.trim();

    const [updatedSession, question] = await Promise.all([
      db.updateSession(sessionId, { status: 'in_progress', started_at: new Date().toISOString() }),
      db.createQuestion({ session_id: sessionId, question_number: 1, question_text: questionText }),
    ]);

    return NextResponse.json({
      status: updatedSession.status,
      started_at: updatedSession.started_at,
      current_question: {
        id: question.id,
        question_number: question.question_number,
        question_text: question.question_text,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
