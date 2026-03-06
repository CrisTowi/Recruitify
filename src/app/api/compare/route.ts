import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { CompanyWithNextStep, CompanyOffer } from '@/types';

export interface CompareEntry {
  company: CompanyWithNextStep;
  offer: CompanyOffer | null;
}

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const all = await db.getAllCompanies();
    const offerCompanies = all.filter((c) => c.status === 'Offer');
    const entries: CompareEntry[] = await Promise.all(
      offerCompanies.map(async (company) => ({
        company,
        offer: await db.getOffer(company.id),
      })),
    );
    return NextResponse.json(entries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
