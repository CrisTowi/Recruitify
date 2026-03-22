import type { LLMProvider, TTSProvider, STTProvider } from '@/types';

export const TTS_PROVIDERS: { value: TTSProvider | null; label: string }[] = [
  { value: null, label: 'Disabled' },
  { value: 'browser', label: 'Browser (built-in, no key needed)' },
  { value: 'openai', label: 'OpenAI TTS' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
];

export const STT_PROVIDERS: { value: STTProvider | null; label: string }[] = [
  { value: null, label: 'Disabled' },
  { value: 'browser', label: 'Browser (built-in, no key needed)' },
  { value: 'openai', label: 'OpenAI Whisper' },
  { value: 'deepgram', label: 'Deepgram' },
];

export const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
];

export interface ModelOption {
  id: string;
  name: string;
  context_window: number;
}

export async function fetchModels(provider: LLMProvider): Promise<ModelOption[]> {
  const res = await fetch(`/api/llm/models?provider=${provider}`);
  if (!res.ok) return [];
  const data = await res.json() as { models: ModelOption[] };
  return data.models;
}

export async function fetchAISettings() {
  const res = await fetch('/api/ai-settings');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load AI settings');
  return res.json();
}

export async function saveAISettings(payload: Record<string, unknown>) {
  const res = await fetch('/api/ai-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function testAISettings(provider: LLMProvider, model: string, apiKey: string) {
  const res = await fetch('/api/ai-settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llm_provider: provider, llm_model: model, llm_api_key: apiKey }),
  });
  return res.json() as Promise<{ success: boolean; error?: string; latency_ms?: number }>;
}
