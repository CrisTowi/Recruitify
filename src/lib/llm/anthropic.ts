import type { LLMClient, ChatMessage, ChatOptions, ChatResponse, ChatChunk } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicClient implements LLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  private buildBody(messages: ChatMessage[], options: ChatOptions, stream: boolean) {
    // Anthropic separates system messages from the messages array
    const systemMessages = messages.filter((message) => message.role === 'system');
    const conversationMessages = messages.filter((message) => message.role !== 'system');

    return {
      model: this.model,
      system: systemMessages.map((message) => message.content).join('\n') || undefined,
      messages: conversationMessages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      stream,
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(this.buildBody(messages, options, false)),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text as string,
      usage: {
        input_tokens: data.usage.input_tokens as number,
        output_tokens: data.usage.output_tokens as number,
      },
    };
  }

  async *stream(messages: ChatMessage[], options: ChatOptions = {}): AsyncIterable<ChatChunk> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(this.buildBody(messages, options, true)),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error?.error?.message ?? `Anthropic API error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

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

          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            yield { type: 'chunk', content: parsed.delta.text };
          } else if (parsed.type === 'message_start') {
            inputTokens = parsed.message?.usage?.input_tokens ?? 0;
          } else if (parsed.type === 'message_delta') {
            outputTokens = parsed.usage?.output_tokens ?? 0;
          } else if (parsed.type === 'message_stop') {
            yield { type: 'done', usage: { input_tokens: inputTokens, output_tokens: outputTokens } };
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}
