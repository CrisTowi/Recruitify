import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { KanbanBoard, ApplicationStatus } from '@/types';

const STATUSES: ApplicationStatus[] = [
  'Wishlist',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Ghosted',
];

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const companies = await db.getAllCompanies();

    // Group by status into kanban columns
    const board = Object.fromEntries(STATUSES.map((s) => [s, []])) as unknown as KanbanBoard;
    for (const company of companies) {
      board[company.status].push(company);
    }

    return NextResponse.json(board);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, logo_url, status } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const company = await db.createCompany({
      name: name.trim(),
      logo_url: logo_url || null,
      status: status ?? 'Wishlist',
    });
    return NextResponse.json(company, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
