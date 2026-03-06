'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import styles from './page.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Check invitation before sending magic link
    const inviteRes = await fetch('/api/auth/check-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!inviteRes.ok) {
      const { error: inviteError } = await inviteRes.json().catch(() => ({ error: 'Access denied.' }));
      setError(inviteError ?? 'Access denied.');
      setLoading(false);
      return;
    }

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
        <h1 className={styles.title}>Sign in to Recruitify</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a magic link to sign in.
        </p>

        {sent ? (
          <div className={styles.successMessage}>
            <div className={styles.successTitle}>Check your email</div>
            <p className={styles.successText}>
              A magic link has been sent to <strong>{email}</strong>. Click the link in the email to sign in.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
