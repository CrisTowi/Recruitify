'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { locales } from '@/i18n/routing';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from './ProfileSettings.module.css';

interface Props {
  initialLanguage: string;
}

export default function ProfileSettings({ initialLanguage }: Props) {
  const t = useTranslations('profile');
  const { toast } = useToast();
  const router = useRouter();
  const [language, setLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      toast(t('saved'), 'success');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save preferences';
      toast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t('title')}</h1>

      <div className={styles.field}>
        <label htmlFor="language-select" className={styles.label}>
          {t('language')}
        </label>
        <p className={styles.description}>{t('languageDescription')}</p>
        <select
          id="language-select"
          className={styles.select}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          disabled={saving}
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {t(`languages.${locale}`)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  );
}
