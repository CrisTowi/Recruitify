export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ChatChunk {
  type: 'chunk' | 'done';
  content?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LLMClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}

export interface LLMModel {
  id: string;
  name: string;
  context_window: number;
}
