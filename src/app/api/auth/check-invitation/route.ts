import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Invitation checks only apply when auth is enabled on the hosted service
  if (process.env.SUPABASE_AUTH !== 'true') {
    return NextResponse.json({ allowed: true });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    // If service role key is not configured, skip the check (setup in progress)
    return NextResponse.json({ allowed: true });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').toLowerCase().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { error: 'This email has not been invited. Contact the admin to request access.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ allowed: true });
}
