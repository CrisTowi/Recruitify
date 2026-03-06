import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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
  const body = await request.json() as {
    status?: ApplicationStatus;
    interest_level?: InterestLevel | null;
    prep_notes?: string | null;
  };

  const update: { status?: ApplicationStatus; interest_level?: InterestLevel | null; prep_notes?: string | null } = {};

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

  if ('prep_notes' in body) {
    update.prep_notes = typeof body.prep_notes === 'string' ? body.prep_notes : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const db = await getDb(request);
    const company = await db.updateCompany(id, update);
    return NextResponse.json(company);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = await getDb(request);
    await db.deleteCompany(id);
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
