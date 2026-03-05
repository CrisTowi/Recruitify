import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStoredTokens } from '@/lib/googleAuth';

export async function GET(req: Request) {
  const db = await getDb(req);
  const tokens = await getStoredTokens(db);
  return NextResponse.json({ connected: !!tokens });
}
