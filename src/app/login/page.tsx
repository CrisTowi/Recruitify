'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useTranslations } from 'next-intl';
import styles from './page.module.css';

export default function LoginPage() {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // Check invitation before sending magic link
    const inviteRes = await fetch('/api/auth/check-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!inviteRes.ok) {
      let inviteBody: { error?: string } = { error: t('accessDenied') };
      try { inviteBody = await inviteRes.json(); } catch { /* use default */ }
      setError(inviteBody.error ?? t('accessDenied'));
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/api/auth/callback',
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>

        {sent ? (
          <div className={styles.successMessage}>
            <div className={styles.successTitle}>{t('checkEmail')}</div>
            <p className={styles.successText}>
              {t('magicLinkSentBefore')} <strong>{email}</strong>. {t('magicLinkSentAfter')}
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !email}
            >
              {loading ? t('sending') : t('send')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
