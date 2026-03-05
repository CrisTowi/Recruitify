import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type Ctx = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, eventId } = await params;
  const body = await request.json() as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if ('title' in body)          update.title          = body.title          || null;
  if ('body' in body)           update.body           = body.body           || null;
  if ('contact_name' in body)   update.contact_name   = body.contact_name   || null;
  if ('contact_role' in body)   update.contact_role   = body.contact_role   || null;
  if ('contact_email' in body)  update.contact_email  = body.contact_email  || null;
  if ('scheduled_at' in body)   update.scheduled_at   = body.scheduled_at   || null;
  if ('process_status' in body) update.process_status = body.process_status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const db = await getDb(request);
    const event = await db.updateTimelineEvent(id, eventId, update);
    return NextResponse.json(event);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
