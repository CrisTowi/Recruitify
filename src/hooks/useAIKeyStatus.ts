import { useEffect, useState } from 'react';

/**
 * Returns whether a valid LLM API key is configured.
 * null = still loading, true = key present, false = no key.
 */
export function useAIKeyStatus(): boolean | null {
  const [hasAIKey, setHasAIKey] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/ai-settings');
        if (!res.ok) {
          setHasAIKey(false);
          return;
        }
        const data = await res.json() as { has_llm_key: boolean };
        setHasAIKey(data.has_llm_key);
      } catch {
        setHasAIKey(false);
      }
    }
    check();
  }, []);

  return hasAIKey;
}
