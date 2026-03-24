import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { AISettingsInput, LLMProvider, TTSProvider, STTProvider } from '@/types';

const VALID_LLM_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'gemini', 'openrouter'];
const VALID_TTS_PROVIDERS: TTSProvider[] = ['browser', 'deepgram'];
const VALID_STT_PROVIDERS: STTProvider[] = ['browser', 'deepgram'];

export async function GET(req: Request) {
  try {
    const db = await getDb(req);
    const settings = await db.getAISettings();
    if (!settings) {
      return NextResponse.json({ error: 'No AI settings configured', code: 'NO_AI_SETTINGS' }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  let body: Partial<AISettingsInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { llm_provider, llm_model, llm_api_key, tts_provider, tts_api_key, tts_voice_id, stt_provider, stt_api_key } = body;

  if (!llm_provider || !VALID_LLM_PROVIDERS.includes(llm_provider)) {
    return NextResponse.json({ error: `llm_provider must be one of: ${VALID_LLM_PROVIDERS.join(', ')}` }, { status: 400 });
  }
  if (!llm_model?.trim()) {
    return NextResponse.json({ error: 'llm_model is required' }, { status: 400 });
  }
  if (tts_provider && !VALID_TTS_PROVIDERS.includes(tts_provider)) {
    return NextResponse.json({ error: `tts_provider must be one of: ${VALID_TTS_PROVIDERS.join(', ')}` }, { status: 400 });
  }
  if (stt_provider && !VALID_STT_PROVIDERS.includes(stt_provider)) {
    return NextResponse.json({ error: `stt_provider must be one of: ${VALID_STT_PROVIDERS.join(', ')}` }, { status: 400 });
  }

  try {
    const db = await getDb(req);
    const settings = await db.upsertAISettings(null, {
      llm_provider,
      llm_model: llm_model.trim(),
      llm_api_key: llm_api_key ?? null,
      tts_provider: tts_provider ?? null,
      tts_api_key: tts_api_key ?? null,
      tts_voice_id: tts_voice_id ?? null,
      stt_provider: stt_provider ?? null,
      stt_api_key: stt_api_key ?? null,
    });
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message.includes('ENCRYPTION_KEY')) {
      return NextResponse.json({ error: message, code: 'ENCRYPTION_ERROR' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
