import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const [aiSettings, aiKeys] = await Promise.all([
      db.getAISettings(),
      db.getDecryptedAIKeys(),
    ]);

    if (!aiSettings?.stt_provider || aiSettings.stt_provider !== 'deepgram') {
      return NextResponse.json({ error: 'Deepgram STT not configured' }, { status: 400 });
    }

    if (!aiKeys?.stt_api_key) {
      return NextResponse.json({ error: 'No STT API key configured' }, { status: 400 });
    }

    return NextResponse.json({ apiKey: aiKeys.stt_api_key });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
