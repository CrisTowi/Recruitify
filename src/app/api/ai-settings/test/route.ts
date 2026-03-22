import { NextResponse } from 'next/server';
import { createLLMClient } from '@/lib/llm/factory';
import type { LLMProvider } from '@/types';

const VALID_LLM_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'gemini', 'openrouter'];

export async function POST(req: Request) {
  let body: { llm_provider?: string; llm_model?: string; llm_api_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { llm_provider, llm_model, llm_api_key } = body;

  if (!llm_provider || !VALID_LLM_PROVIDERS.includes(llm_provider as LLMProvider)) {
    return NextResponse.json({ success: false, error: `llm_provider must be one of: ${VALID_LLM_PROVIDERS.join(', ')}` }, { status: 400 });
  }
  if (!llm_model?.trim()) {
    return NextResponse.json({ success: false, error: 'llm_model is required' }, { status: 400 });
  }
  if (!llm_api_key?.trim()) {
    return NextResponse.json({ success: false, error: 'llm_api_key is required' }, { status: 400 });
  }

  const start = Date.now();

  try {
    const client = createLLMClient(llm_provider as LLMProvider, llm_api_key.trim(), llm_model.trim());

    await client.chat(
      [{ role: 'user', content: 'Reply with only the word "ok".' }],
      { maxTokens: 10 },
    );

    const latency_ms = Date.now() - start;
    return NextResponse.json({ success: true, model: llm_model.trim(), latency_ms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
