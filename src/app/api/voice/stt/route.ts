import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { transcribeWithOpenAI, transcribeWithDeepgram } from '@/lib/voice/stt';

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const audioEntry = formData.get('audio');
  if (!audioEntry || !(audioEntry instanceof File)) {
    return NextResponse.json({ error: 'audio file is required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const [aiSettings, aiKeys] = await Promise.all([
      db.getAISettings(),
      db.getDecryptedAIKeys(),
    ]);

    if (!aiSettings?.stt_provider || aiSettings.stt_provider === 'browser') {
      return NextResponse.json({ error: 'No cloud STT provider configured' }, { status: 400 });
    }

    if (!aiKeys?.stt_api_key) {
      return NextResponse.json({ error: 'No STT API key configured' }, { status: 400 });
    }

    let transcript: string;

    if (aiSettings.stt_provider === 'openai') {
      transcript = await transcribeWithOpenAI(audioEntry, aiKeys.stt_api_key);
    } else if (aiSettings.stt_provider === 'deepgram') {
      transcript = await transcribeWithDeepgram(audioEntry, aiKeys.stt_api_key);
    } else {
      return NextResponse.json({ error: 'Unsupported STT provider' }, { status: 400 });
    }

    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'STT request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
