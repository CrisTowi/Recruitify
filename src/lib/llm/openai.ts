import type { LLMClient, ChatMessage, ChatOptions, ChatResponse, ChatChunk } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIClient implements LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string = OPENAI_API_URL,
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content as string,
      usage: {
        input_tokens: data.usage.prompt_tokens as number,
        output_tokens: data.usage.completion_tokens as number,
      },
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions = {}): AsyncIterable<ChatChunk> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `OpenAI API error: ${response.status}`);
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
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield { type: 'chunk', content };
          if (parsed.choices?.[0]?.finish_reason === 'stop') {
            yield {
              type: 'done',
              usage: {
                input_tokens: parsed.usage?.prompt_tokens ?? 0,
                output_tokens: parsed.usage?.completion_tokens ?? 0,
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
