import { OpenAIClient } from './openai';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenRouter uses the OpenAI-compatible API — delegate to OpenAIClient with a different base URL.
 */
export class OpenRouterClient extends OpenAIClient {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, OPENROUTER_API_URL);
  }
}
