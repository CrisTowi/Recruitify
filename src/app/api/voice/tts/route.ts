import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { speakWithDeepgram } from '@/lib/voice/tts';

interface TTSBody {
  text: string;
  voice_id?: string;
}

export async function POST(req: Request) {
  let body: TTSBody;
  try {
    body = await req.json() as TTSBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { text, voice_id } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const [aiSettings, aiKeys] = await Promise.all([
      db.getAISettings(),
      db.getDecryptedAIKeys(),
    ]);

    if (!aiSettings?.tts_provider || aiSettings.tts_provider === 'browser') {
      return NextResponse.json({ error: 'No cloud TTS provider configured' }, { status: 400 });
    }

    if (!aiKeys?.tts_api_key) {
      return NextResponse.json({ error: 'No TTS API key configured' }, { status: 400 });
    }

    const resolvedVoiceId = voice_id ?? aiSettings.tts_voice_id ?? '';
    const audioResponse = await speakWithDeepgram(text, aiKeys.tts_api_key, resolvedVoiceId);

    return new Response(audioResponse.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'TTS request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
