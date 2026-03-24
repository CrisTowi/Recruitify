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

    if (session.status !== 'in_progress' && session.status !== 'configuring') {
      return NextResponse.json(
        { error: 'Session cannot be cancelled in its current state', code: 'INVALID_SESSION_STATE' },
        { status: 409 },
      );
    }

    await db.updateSession(sessionId, { status: 'cancelled' });

    return NextResponse.json({ status: 'cancelled' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
