import type { LLMClient, ChatMessage, ChatOptions, ChatResponse, ChatChunk } from './types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function toGeminiContents(messages: ChatMessage[]): object[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
}

function getSystemInstruction(messages: ChatMessage[]): string | undefined {
  const systemMessages = messages.filter((message) => message.role === 'system');
  if (systemMessages.length === 0) return undefined;
  return systemMessages.map((message) => message.content).join('\n');
}

export class GeminiClient implements LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const url = `${GEMINI_BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;

    const systemInstruction = getSystemInstruction(messages);
    const body: Record<string, unknown> = {
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text as string,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions = {}): AsyncIterable<ChatChunk> {
    const url = `${GEMINI_BASE_URL}/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const systemInstruction = getSystemInstruction(messages);
    const body: Record<string, unknown> = {
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `Gemini API error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield { type: 'chunk', content: text };

          if (parsed.candidates?.[0]?.finishReason === 'STOP') {
            yield {
              type: 'done',
              usage: {
                input_tokens: parsed.usageMetadata?.promptTokenCount ?? 0,
                output_tokens: parsed.usageMetadata?.candidatesTokenCount ?? 0,
              },
            };
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}
