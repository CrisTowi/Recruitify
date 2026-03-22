'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { InterviewSessionFull } from '@/types';
import SessionDebrief from '@/components/SessionDebrief/SessionDebrief';
import styles from './page.module.css';

export default function DebriefPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<InterviewSessionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setSession(await res.json() as InterviewSessionFull);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <div className={styles.state}>
        <div className={styles.spinner} aria-label="Loading…" />
        <p>Loading debrief…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.state}>
        <p className={styles.errorText}>{error ?? 'Session not found.'}</p>
        <button className={styles.backButton} onClick={() => router.push('/')}>Back to board</button>
      </div>
    );
  }

  if (session.status !== 'completed') {
    return (
      <div className={styles.state}>
        <p className={styles.errorText}>This session has not been completed yet.</p>
        <button className={styles.backButton} onClick={() => router.push(`/session/${sessionId}`)}>
          Back to session
        </button>
      </div>
    );
  }

  return (
    <SessionDebrief
      session={session}
      onRegenerated={setSession}
    />
  );
}
