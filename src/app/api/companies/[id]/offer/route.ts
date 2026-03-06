import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const db = await getDb(req);
    const offer = await db.getOffer(id);
    if (!offer) return NextResponse.json(null, { status: 200 });
    return NextResponse.json(offer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  try {
    const db = await getDb(req);
    const offer = await db.upsertOffer(id, body);
    return NextResponse.json(offer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
