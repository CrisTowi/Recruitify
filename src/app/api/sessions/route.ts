import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { CreateSessionInput, FeedbackMode, Difficulty, SessionStatus } from '@/types';

const VALID_FEEDBACK_MODES: FeedbackMode[] = ['immediate', 'full_simulation'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const VALID_STATUSES: SessionStatus[] = ['configuring', 'in_progress', 'completed', 'cancelled'];

export async function POST(req: Request) {
  let body: Partial<CreateSessionInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { company_id, stage_id, feedback_mode, num_questions, interviewer_persona, difficulty, focus_areas } = body;

  if (!company_id?.trim()) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }
  if (!stage_id?.trim()) {
    return NextResponse.json({ error: 'stage_id is required' }, { status: 400 });
  }
  if (!feedback_mode || !VALID_FEEDBACK_MODES.includes(feedback_mode)) {
    return NextResponse.json({ error: `feedback_mode must be one of: ${VALID_FEEDBACK_MODES.join(', ')}` }, { status: 400 });
  }
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` }, { status: 400 });
  }

  const questionCount = num_questions ?? 5;
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) {
    return NextResponse.json({ error: 'num_questions must be an integer between 1 and 20' }, { status: 400 });
  }

  try {
    const db = await getDb(req);

    // Verify AI settings exist before creating session
    const aiSettings = await db.getAISettings();
    if (!aiSettings?.has_llm_key) {
      return NextResponse.json(
        { error: 'AI settings not configured. Please add your API key first.', code: 'NO_AI_SETTINGS' },
        { status: 403 },
      );
    }

    const session = await db.createSession({
      company_id: company_id.trim(),
      stage_id: stage_id.trim(),
      feedback_mode,
      num_questions: questionCount,
      interviewer_persona: interviewer_persona ?? null,
      difficulty,
      focus_areas: focus_areas ?? [],
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company_id = searchParams.get('company_id') ?? undefined;
  const stage_id = searchParams.get('stage_id') ?? undefined;
  const statusParam = searchParams.get('status') ?? undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  if (statusParam && !VALID_STATUSES.includes(statusParam as SessionStatus)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const result = await db.listSessions({
      company_id,
      stage_id,
      status: statusParam as SessionStatus | undefined,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
