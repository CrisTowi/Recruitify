import { NextResponse } from 'next/server';
import { buildOAuthUrl } from '@/lib/googleAuth';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = buildOAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
