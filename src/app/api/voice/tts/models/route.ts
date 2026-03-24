import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface DeepgramTTSModel {
  name: string;
  canonical_name: string;
  language: string;
}

interface DeepgramModelsResponse {
  tts?: DeepgramTTSModel[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get('key');

  let apiKey: string | null = keyParam?.trim() || null;

  if (!apiKey) {
    try {
      const db = await getDb(req);
      const aiKeys = await db.getDecryptedAIKeys();
      apiKey = aiKeys?.tts_api_key ?? null;
    } catch {
      return NextResponse.json({ error: 'Failed to load stored key' }, { status: 500 });
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'No TTS API key available' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/models', {
      headers: { 'Authorization': `Token ${apiKey}` },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Deepgram error: ${error}` }, { status: response.status });
    }

    const data = await response.json() as DeepgramModelsResponse;
    const voices = (data.tts ?? []).map((model) => ({
      id: model.canonical_name,
      name: model.name,
      language: model.language,
    }));

    return NextResponse.json({ voices });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch models';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
