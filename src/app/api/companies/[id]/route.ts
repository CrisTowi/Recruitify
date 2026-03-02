import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ApplicationStatus, InterestLevel } from '@/types';

const VALID_STATUSES: ApplicationStatus[] = [
  'Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted',
];

const VALID_INTEREST_LEVELS: InterestLevel[] = [
  'Excited', 'Interested', 'Meh', 'Not interested',
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { status?: ApplicationStatus; interest_level?: InterestLevel | null };

  const update: Record<string, unknown> = {};

  if ('status' in body) {
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = body.status;
  }

  if ('interest_level' in body) {
    if (body.interest_level !== null && !VALID_INTEREST_LEVELS.includes(body.interest_level!)) {
      return NextResponse.json({ error: 'Invalid interest_level' }, { status: 400 });
    }
    update.interest_level = body.interest_level ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
