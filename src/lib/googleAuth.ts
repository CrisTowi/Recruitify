import type { DbAdapter } from '@/lib/db/types';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getStoredTokens(db: DbAdapter) {
  return db.getGoogleTokens();
}

export async function getValidAccessToken(db: DbAdapter): Promise<string | null> {
  const tokens = await db.getGoogleTokens();
  if (!tokens) return null;

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();

  // Refresh if expiring within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return refreshAccessToken(db, tokens.refresh_token);
  }

  return tokens.access_token;
}

async function refreshAccessToken(db: DbAdapter, refreshToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const json = await res.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + json.expires_in * 1000);

  await db.upsertGoogleTokens({
    access_token: json.access_token,
    refresh_token: refreshToken,
    expires_at: expiresAt.toISOString(),
  });

  return json.access_token;
}

export function buildOAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  db: DbAdapter,
  code: string,
  redirectUri: string,
): Promise<boolean> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) return false;

  const json = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!json.refresh_token) return false;

  const expiresAt = new Date(Date.now() + json.expires_in * 1000);

  try {
    await db.upsertGoogleTokens({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: expiresAt.toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
