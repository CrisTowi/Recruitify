import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;

  try {
    const db = await getDb(req);
    const stages = await db.getRoadmap(id);
    return NextResponse.json(stages);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json() as { stage_name?: string; scheduled_date?: string | null };

  if (!body.stage_name?.trim()) {
    return NextResponse.json({ error: 'stage_name is required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const stage = await db.createStage(id, {
      stage_name: body.stage_name.trim(),
      scheduled_date: body.scheduled_date ?? null,
    });
    return NextResponse.json(stage, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
