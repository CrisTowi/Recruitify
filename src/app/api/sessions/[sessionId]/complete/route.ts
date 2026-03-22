import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type Ctx = { params: Promise<{ sessionId: string }> };

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
