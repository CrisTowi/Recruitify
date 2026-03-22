'use client';

import { useEffect, useRef, useState } from 'react';
import type { LLMProvider, AISettings } from '@/types';
import { LLM_PROVIDERS, type ModelOption, fetchModels, fetchAISettings, saveAISettings, testAISettings } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from './AISettingsModal.module.css';

interface Props {
  onClose: () => void;
}

export default function AISettingsModal({ onClose }: Props) {
  const { toast } = useToast();

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

  const apiKeyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef(model);
  useEffect(() => { modelRef.current = model; }, [model]);

  // Load existing settings on mount
  useEffect(() => {
    async function load() {
      try {
        const settings = await fetchAISettings() as AISettings | null;
        if (settings) {
          setProvider(settings.llm_provider);
          setModel(settings.llm_model);
          setHasExistingKey(settings.has_llm_key);
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
      setError('Enter an API key to test.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await testAISettings(provider, model, keyToTest);
      if (result.success) {
        setTestResult({ success: true, message: `Connected in ${result.latency_ms}ms` });
      } else {
        setTestResult({ success: false, message: result.error ?? 'Connection failed' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
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
      if (apiKey.trim()) {
        payload.llm_api_key = apiKey.trim();
      }

      await saveAISettings(payload);
      toast('AI settings saved.');
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
          <h2 id="ai-settings-title" className={styles.title}>AI Settings</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className={styles.description}>
          Configure your LLM provider and API key for interview simulations. Your key is encrypted at rest and never shared.
        </p>

        {loading ? (
          <p className={styles.loadingText}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="ai-provider" className={styles.label}>Provider</label>
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
              <label htmlFor="ai-model" className={styles.label}>Model</label>
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
                API Key
                {hasExistingKey && (
                  <span className={styles.keyHint}> (key saved — leave blank to keep existing)</span>
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
                  placeholder={hasExistingKey ? '••••••••••••••••' : 'Enter your API key'}
                  disabled={submitting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={styles.testButton}
                  onClick={handleTest}
                  disabled={testing || submitting}
                >
                  {testing ? 'Testing…' : 'Test'}
                </button>
              </div>

              {testResult && (
                <p className={testResult.success ? styles.testSuccess : styles.testError}>
                  {testResult.success ? '✓ ' : '✗ '}{testResult.message}
                </p>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
