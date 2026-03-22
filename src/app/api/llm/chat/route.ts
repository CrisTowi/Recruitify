import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createLLMClient } from '@/lib/llm/factory';
import type { ChatMessage, ChatOptions } from '@/lib/llm/types';

interface ChatBody {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = await req.json() as ChatBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages, temperature, max_tokens, stream } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  try {
    const db = await getDb(req);

    const [aiSettings, aiKeys] = await Promise.all([
      db.getAISettings(),
      db.getDecryptedAIKeys(),
    ]);

    if (!aiSettings || !aiKeys?.llm_api_key) {
      return NextResponse.json({ error: 'No LLM API key configured', code: 'NO_AI_SETTINGS' }, { status: 403 });
    }

    const llm = createLLMClient(aiSettings.llm_provider, aiKeys.llm_api_key, aiSettings.llm_model);
    const options: ChatOptions = { temperature, maxTokens: max_tokens };

    if (stream) {
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of llm.stream(messages, options)) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const response = await llm.chat(messages, options);
    return NextResponse.json({ content: response.content, usage: response.usage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
