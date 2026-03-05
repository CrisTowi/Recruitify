import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DuplicateCalendarEventError } from '@/lib/db/types';
import type { CreateTimelineEventPayload, TimelineEventType } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';

const VALID_EVENT_TYPES: TimelineEventType[] = ['note', 'contact', 'appointment', 'process_status', 'status_change'];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;

  try {
    const db = await getDb(req);
    const events = await db.getTimeline(id);
    return NextResponse.json(events);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json() as CreateTimelineEventPayload & { calendar_event_id?: string };
  const { event_type } = body;

  if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
    return NextResponse.json({ error: 'Invalid or missing event_type' }, { status: 400 });
  }
  if (event_type === 'contact' && !body.contact_name?.trim()) {
    return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
  }
  if (
    event_type === 'process_status' &&
    (!body.process_status || !(PROCESS_STATUS_VALUES as string[]).includes(body.process_status))
  ) {
    return NextResponse.json({ error: 'Invalid process_status' }, { status: 400 });
  }

  const payload: CreateTimelineEventPayload & { calendar_event_id?: string } = { event_type };

  if (body.calendar_event_id) payload.calendar_event_id = body.calendar_event_id;

  if (event_type === 'note') {
    if (body.title?.trim()) payload.title = body.title.trim();
    if (body.body?.trim()) payload.body = body.body.trim();
  } else if (event_type === 'contact') {
    payload.contact_name = body.contact_name!.trim();
    if (body.contact_role?.trim()) payload.contact_role = body.contact_role.trim();
    if (body.contact_email?.trim()) payload.contact_email = body.contact_email.trim();
    if (body.body?.trim()) payload.body = body.body.trim();
  } else if (event_type === 'appointment') {
    if (body.title?.trim()) payload.title = body.title.trim();
    if (body.scheduled_at) payload.scheduled_at = body.scheduled_at;
    if (body.body?.trim()) payload.body = body.body.trim();
  } else if (event_type === 'process_status') {
    payload.process_status = body.process_status;
  } else if (event_type === 'status_change') {
    if (body.title) payload.title = body.title;
    if (body.body) payload.body = body.body;
  }

  try {
    const db = await getDb(request);
    const event = await db.createTimelineEvent(id, payload);
    return NextResponse.json(event, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof DuplicateCalendarEventError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
