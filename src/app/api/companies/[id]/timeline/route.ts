import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { CreateTimelineEventPayload, TimelineEventType } from '@/types';
import { PROCESS_STATUS_VALUES } from '@/types';

const VALID_EVENT_TYPES: TimelineEventType[] = ['note', 'contact', 'appointment', 'process_status'];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json() as CreateTimelineEventPayload;
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

  const row: Record<string, unknown> = { company_id: id, event_type };

  if (event_type === 'note') {
    if (body.title?.trim()) row.title = body.title.trim();
    if (body.body?.trim()) row.body = body.body.trim();
  } else if (event_type === 'contact') {
    row.contact_name = body.contact_name!.trim();
    if (body.contact_role?.trim()) row.contact_role = body.contact_role.trim();
    if (body.contact_email?.trim()) row.contact_email = body.contact_email.trim();
    if (body.body?.trim()) row.body = body.body.trim();
  } else if (event_type === 'appointment') {
    if (body.title?.trim()) row.title = body.title.trim();
    if (body.scheduled_at) row.scheduled_at = body.scheduled_at;
    if (body.body?.trim()) row.body = body.body.trim();
  } else if (event_type === 'process_status') {
    row.process_status = body.process_status;
  }

  const { data, error } = await supabase
    .from('timeline_events')
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
