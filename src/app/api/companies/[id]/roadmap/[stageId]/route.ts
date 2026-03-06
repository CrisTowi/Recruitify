import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type Ctx = { params: Promise<{ id: string; stageId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, stageId } = await params;
  const body = await req.json() as {
    is_completed?: boolean;
    stage_name?: string;
    scheduled_date?: string | null;
    notes?: string | null;
  };

  const update: Record<string, unknown> = {};
  if (body.is_completed !== undefined) update.is_completed = body.is_completed;
  if (body.stage_name?.trim())         update.stage_name   = body.stage_name.trim();
  if ('scheduled_date' in body)        update.scheduled_date = body.scheduled_date ?? null;
  if ('notes' in body)                 update.notes          = body.notes ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const stage = await db.updateStage(id, stageId, update);
    return NextResponse.json(stage);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id, stageId } = await params;

  try {
    const db = await getDb(req);
    await db.deleteStage(id, stageId);
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
