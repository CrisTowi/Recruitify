import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const expectations = await db.getExpectations();
    return NextResponse.json(expectations ?? null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  try {
    const db = await getDb(req);
    const expectations = await db.upsertExpectations(body);
    return NextResponse.json(expectations);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
