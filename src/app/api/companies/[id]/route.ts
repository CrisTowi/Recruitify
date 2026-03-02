import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ApplicationStatus } from '@/types';

const VALID_STATUSES: ApplicationStatus[] = [
  'Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted',
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: ApplicationStatus };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('companies')
    .update({ status })
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
