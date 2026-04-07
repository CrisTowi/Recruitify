import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { locales, defaultLocale } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const prefs = await db.getUserPreferences();
    return NextResponse.json(prefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as { language?: string };
    const language = body.language;

    if (language !== undefined && !(locales as readonly string[]).includes(language)) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    const db = await getDb(req);
    const prefs = await db.updateUserPreferences(null, { language: language ?? defaultLocale });

    const locale = (prefs.language ?? defaultLocale) as Locale;
    const response = NextResponse.json(prefs);
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
