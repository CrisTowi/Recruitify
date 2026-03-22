import { NextResponse } from 'next/server';
import { PROVIDER_MODELS } from '@/lib/llm/factory';
import type { LLMProvider } from '@/types';

const VALID_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'gemini', 'openrouter'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider || !VALID_PROVIDERS.includes(provider as LLMProvider)) {
    return NextResponse.json(
      { error: `provider query param must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 },
    );
  }

  const models = PROVIDER_MODELS[provider as LLMProvider];
  return NextResponse.json({ provider, models });
}
