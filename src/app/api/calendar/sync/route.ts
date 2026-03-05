import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidAccessToken } from '@/lib/googleAuth';
import type { CalendarMatch } from '@/types';

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
}

function matchesCompany(event: GoogleCalendarEvent, companyName: string): boolean {
  const name = companyName.toLowerCase();
  const summary = (event.summary ?? '').toLowerCase();
  const description = (event.description ?? '').toLowerCase();
  return summary.includes(name) || description.includes(name);
}

export async function POST(request: Request) {
  const body = await request.json() as { company_name: string };
  const { company_name } = body;

  if (!company_name?.trim()) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
  }

  const db = await getDb(request);
  const accessToken = await getValidAccessToken(db);
  if (!accessToken) {
    return NextResponse.json({ error: 'not_connected' }, { status: 401 });
  }

  // Fetch events from 60 days ago to 90 days from now
  const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Calendar API error: ${text}` }, { status: 502 });
  }

  const json = await res.json() as { items?: GoogleCalendarEvent[] };
  const items = json.items ?? [];

  const matches: CalendarMatch[] = items
    .filter((event) => matchesCompany(event, company_name))
    .map((event) => ({
      calendar_event_id: event.id,
      title: event.summary ?? '(No title)',
      scheduled_at: event.start.dateTime ?? event.start.date ?? null,
      description: event.description ?? null,
    }));

  return NextResponse.json({ matches });
}
