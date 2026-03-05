import { getDb } from '@/lib/db';
import { exchangeCodeForTokens } from '@/lib/googleAuth';

// Returns a self-closing HTML page so the OAuth popup can close itself
// and notify the opener window.
function htmlResponse(success: boolean): Response {
  const script = success
    ? `window.opener?.postMessage('google_calendar_connected', '*'); window.close();`
    : `window.opener?.postMessage('google_calendar_error', '*'); window.close();`;

  return new Response(
    `<!DOCTYPE html><html><body><script>${script}</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return htmlResponse(false);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const db = await getDb(request);
  const success = await exchangeCodeForTokens(db, code, redirectUri);
  return htmlResponse(success);
}
