import type { LLMProvider } from '@/types';
import type { LLMClient, LLMModel } from './types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';
import { GeminiClient } from './gemini';
import { OpenRouterClient } from './openrouter';

export function createLLMClient(provider: LLMProvider, apiKey: string, model: string): LLMClient {
  switch (provider) {
    case 'openai':
      return new OpenAIClient(apiKey, model);
    case 'anthropic':
      return new AnthropicClient(apiKey, model);
    case 'gemini':
      return new GeminiClient(apiKey, model);
    case 'openrouter':
      return new OpenRouterClient(apiKey, model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export const PROVIDER_MODELS: Record<LLMProvider, LLMModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', context_window: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_window: 128000 },
    { id: 'o3-mini', name: 'o3-mini', context_window: 200000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context_window: 128000 },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', context_window: 200000 },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', context_window: 200000 },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', context_window: 200000 },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context_window: 1000000 },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', context_window: 1000000 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context_window: 2000000 },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', context_window: 128000 },
    { id: 'anthropic/claude-sonnet-4-6', name: 'Anthropic: Claude Sonnet 4.6', context_window: 200000 },
    { id: 'google/gemini-2.0-flash', name: 'Google: Gemini 2.0 Flash', context_window: 1000000 },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B', context_window: 131072 },
    { id: 'mistralai/mistral-large-2411', name: 'Mistral: Mistral Large 2', context_window: 131072 },
  ],
};
