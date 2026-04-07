'use client';

import { useEffect, useRef, useState } from 'react';
import type { LLMProvider, TTSProvider, STTProvider, AISettings } from '@/types';
import {
  LLM_PROVIDERS,
  TTS_PROVIDERS,
  STT_PROVIDERS,
  fetchDeepgramTtsVoices,
  type DeepgramVoice,
  type ModelOption,
  fetchModels,
  fetchAISettings,
  saveAISettings,
  testAISettings,
} from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from './AISettingsModal.module.css';

interface Props {
  onClose: () => void;
}

export default function AISettingsModal({ onClose }: Props) {
  const { toast } = useToast();
  const t = useTranslations('aiSettings');
  const tCommon = useTranslations('common');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [model, setModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);

  const [ttsProvider, setTtsProvider] = useState<TTSProvider | null>(null);
  const [ttsKey, setTtsKey] = useState('');
  const [ttsVoiceId, setTtsVoiceId] = useState('');
  const [hasExistingTtsKey, setHasExistingTtsKey] = useState(false);
  const [deepgramVoices, setDeepgramVoices] = useState<DeepgramVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [sttProvider, setSttProvider] = useState<STTProvider | null>(null);
  const [sttKey, setSttKey] = useState('');
  const [hasExistingSttKey, setHasExistingSttKey] = useState(false);

  const apiKeyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef(model);
  const ttsVoiceIdRef = useRef(ttsVoiceId);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { ttsVoiceIdRef.current = ttsVoiceId; }, [ttsVoiceId]);

  // Load existing settings on mount
  useEffect(() => {
    async function load() {
      try {
        const settings = await fetchAISettings() as AISettings | null;
        if (settings) {
          setProvider(settings.llm_provider);
          setModel(settings.llm_model);
          setHasExistingKey(settings.has_llm_key);
          setTtsProvider(settings.tts_provider ?? null);
          setTtsVoiceId(settings.tts_voice_id ?? '');
          setHasExistingTtsKey(settings.has_tts_key);
          setSttProvider(settings.stt_provider ?? null);
          setHasExistingSttKey(settings.has_stt_key);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        toast(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  // Load models when provider changes
  useEffect(() => {
    async function load() {
      const providerModels = await fetchModels(provider);
      setModels(providerModels);
      // Reset model to first option if current model isn't in new list
      if (providerModels.length > 0 && !providerModels.find((providerModel) => providerModel.id === modelRef.current)) {
        setModel(providerModels[0].id);
      }
    }
    load();
  }, [provider]);

  // Fetch Deepgram TTS voices when provider is deepgram and a key is available
  useEffect(() => {
    if (ttsProvider !== 'deepgram') {
      setDeepgramVoices([]);
      return;
    }
    const keyToUse = ttsKey.trim() || (hasExistingTtsKey ? '' : null);
    if (keyToUse === null) return;

    setLoadingVoices(true);
    void (async () => {
      try {
        const voices = await fetchDeepgramTtsVoices(ttsKey.trim() || undefined);
        setDeepgramVoices(voices);
        if (voices.length > 0 && !voices.find((voice) => voice.id === ttsVoiceIdRef.current)) {
          const preferred = voices.find((voice) => voice.id === 'aura-asteria-en') ?? voices[0];
          setTtsVoiceId(preferred.id);
        }
      } finally {
        setLoadingVoices(false);
      }
    })();
  }, [ttsProvider, ttsKey, hasExistingTtsKey]);

  // Close on Escape
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleProviderChange(newProvider: LLMProvider) {
    setProvider(newProvider);
    setTestResult(null);
    setError(null);
  }

  async function handleTest() {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setError(t('enterKeyToTest'));
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await testAISettings(provider, model, keyToTest);
      if (result.success) {
        setTestResult({ success: true, message: t('connectedIn', { ms: result.latency_ms ?? 0 }) });
      } else {
        setTestResult({ success: false, message: result.error ?? t('connectionFailed') });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('connectionFailed');
      setTestResult({ success: false, message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { llm_provider: provider, llm_model: model };
      if (apiKey.trim()) payload.llm_api_key = apiKey.trim();

      payload.tts_provider = ttsProvider;
      if (ttsKey.trim()) payload.tts_api_key = ttsKey.trim();
      payload.tts_voice_id = ttsVoiceId.trim() || null;
      payload.stt_provider = sttProvider;
      if (sttKey.trim()) payload.stt_api_key = sttKey.trim();

      await saveAISettings(payload);
      toast(t('saved'));
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      toast(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
      >
        <div className={styles.header}>
          <h2 id="ai-settings-title" className={styles.title}>{t('title')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={tCommon('close')}>
            ✕
          </button>
        </div>

        <p className={styles.description}>
          {t('description')}
        </p>

        {loading ? (
          <p className={styles.loadingText}>{tCommon('loading')}</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="ai-provider" className={styles.label}>{t('provider')}</label>
              <select
                id="ai-provider"
                className={styles.select}
                value={provider}
                onChange={(event) => handleProviderChange(event.target.value as LLMProvider)}
                disabled={submitting}
              >
                {LLM_PROVIDERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ai-model" className={styles.label}>{t('model')}</label>
              <select
                id="ai-model"
                className={styles.select}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                disabled={submitting || models.length === 0}
              >
                {models.map((modelOption) => (
                  <option key={modelOption.id} value={modelOption.id}>{modelOption.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ai-api-key" className={styles.label}>
                {t('apiKey')}
                {hasExistingKey && (
                  <span className={styles.keyHint}> {t('keySaved')}</span>
                )}
              </label>
              <div className={styles.keyRow}>
                <input
                  ref={apiKeyRef}
                  id="ai-api-key"
                  type="password"
                  className={styles.input}
                  value={apiKey}
                  onChange={(event) => { setApiKey(event.target.value); setTestResult(null); }}
                  placeholder={hasExistingKey ? '••••••••••••••••' : t('enterApiKey')}
                  disabled={submitting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={styles.testButton}
                  onClick={handleTest}
                  disabled={testing || submitting}
                >
                  {testing ? t('testing') : t('test')}
                </button>
              </div>

              {testResult && (
                <p className={testResult.success ? styles.testSuccess : styles.testError}>
                  {testResult.success ? '✓ ' : '✗ '}{testResult.message}
                </p>
              )}
            </div>

            {/* ── Voice (optional) ── */}
            <p className={styles.sectionDivider}>{t('voice')}</p>

            <div className={styles.field}>
              <label htmlFor="tts-provider" className={styles.label}>{t('tts')}</label>
              <select
                id="tts-provider"
                className={styles.select}
                value={ttsProvider ?? ''}
                onChange={(event) => setTtsProvider((event.target.value || null) as TTSProvider | null)}
                disabled={submitting}
              >
                {TTS_PROVIDERS.map((option) => (
                  <option key={String(option.value)} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {ttsProvider === 'deepgram' && (
              <div className={styles.field}>
                <label htmlFor="tts-api-key" className={styles.label}>
                  {t('ttsApiKey')}
                  {hasExistingTtsKey && (
                    <span className={styles.keyHint}> {t('keySaved')}</span>
                  )}
                </label>
                <input
                  id="tts-api-key"
                  type="password"
                  className={styles.input}
                  value={ttsKey}
                  onChange={(event) => setTtsKey(event.target.value)}
                  placeholder={hasExistingTtsKey ? '••••••••••••••••' : t('enterTtsKey')}
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>
            )}

            {ttsProvider === 'deepgram' && (
              <div className={styles.field}>
                <label htmlFor="tts-voice-deepgram" className={styles.label}>
                  {t('voiceLabel')}
                  {loadingVoices && <span className={styles.keyHint}> {t('loadingVoices')}</span>}
                  {!loadingVoices && deepgramVoices.length === 0 && (hasExistingTtsKey || ttsKey.trim()) && (
                    <span className={styles.keyHint}> {t('failedToLoadVoices')}</span>
                  )}
                </label>
                <select
                  id="tts-voice-deepgram"
                  className={styles.select}
                  value={ttsVoiceId}
                  onChange={(event) => setTtsVoiceId(event.target.value)}
                  disabled={submitting || loadingVoices || deepgramVoices.length === 0}
                >
                  {deepgramVoices.length === 0 && (
                    <option value="">{t('enterKeyToLoadVoices')}</option>
                  )}
                  {deepgramVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="stt-provider" className={styles.label}>{t('stt')}</label>
              <select
                id="stt-provider"
                className={styles.select}
                value={sttProvider ?? ''}
                onChange={(event) => setSttProvider((event.target.value || null) as STTProvider | null)}
                disabled={submitting}
              >
                {STT_PROVIDERS.map((option) => (
                  <option key={String(option.value)} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {sttProvider === 'deepgram' && (
              <div className={styles.field}>
                <label htmlFor="stt-api-key" className={styles.label}>
                  {t('sttApiKey')}
                  {hasExistingSttKey && (
                    <span className={styles.keyHint}> {t('keySaved')}</span>
                  )}
                </label>
                <input
                  id="stt-api-key"
                  type="password"
                  className={styles.input}
                  value={sttKey}
                  onChange={(event) => setSttKey(event.target.value)}
                  placeholder={hasExistingSttKey ? '••••••••••••••••' : t('enterSttKey')}
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={submitting}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? tCommon('saving') : t('save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
