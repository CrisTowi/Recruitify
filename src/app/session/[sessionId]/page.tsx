'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { InterviewSessionFull } from '@/types';
import InterviewSession from '@/components/InterviewSession/InterviewSession';
import styles from './page.module.css';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<InterviewSessionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [sessionId]);

  if (loading) {
    return <div className={styles.state}>Loading session…</div>;
  }

  if (error || !session) {
    return (
      <div className={styles.state}>
        <p className={styles.errorText}>{error ?? 'Session not found.'}</p>
        <button className={styles.backButton} onClick={() => router.push('/')}>Back to board</button>
      </div>
    );
  }

  // Active session — render the live interview UI
  if (session.status === 'in_progress') {
    return <InterviewSession session={session} />;
  }

  // Session config summary (configuring status)
  const focusAreaDisplay = session.focus_areas.length > 0 ? session.focus_areas.join(', ') : '—';
  const difficultyLabel = session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1);
  const feedbackLabel = session.feedback_mode === 'immediate' ? 'Immediate feedback' : 'Full simulation';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.heading}>Interview Session</h1>
          <span className={`${styles.statusBadge} ${styles[`status_${session.status}`]}`}>
            {session.status.replace('_', ' ')}
          </span>
        </div>

        <dl className={styles.config}>
          <div className={styles.configRow}>
            <dt className={styles.configLabel}>Questions</dt>
            <dd className={styles.configValue}>{session.num_questions}</dd>
          </div>
          <div className={styles.configRow}>
            <dt className={styles.configLabel}>Difficulty</dt>
            <dd className={styles.configValue}>{difficultyLabel}</dd>
          </div>
          <div className={styles.configRow}>
            <dt className={styles.configLabel}>Mode</dt>
            <dd className={styles.configValue}>{feedbackLabel}</dd>
          </div>
          {session.interviewer_persona && (
            <div className={styles.configRow}>
              <dt className={styles.configLabel}>Interviewer</dt>
              <dd className={styles.configValue}>{session.interviewer_persona}</dd>
            </div>
          )}
          <div className={styles.configRow}>
            <dt className={styles.configLabel}>Focus areas</dt>
            <dd className={styles.configValue}>{focusAreaDisplay}</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <button className={styles.backButton} onClick={() => router.push('/')}>
            ← Back to board
          </button>
          {session.status === 'configuring' && (
            <button
              className={styles.startButton}
              onClick={() => setSession((prev) => prev ? { ...prev, status: 'in_progress' } : prev)}
            >
              Begin Interview
            </button>
          )}
          {session.status === 'completed' && (
            <button
              className={styles.startButton}
              onClick={() => router.push(`/session/${sessionId}/debrief`)}
            >
              View Debrief →
            </button>
          )}
          {(session.status === 'cancelled') && (
            <span className={styles.configValue}>This session was cancelled.</span>
          )}
        </div>
      </div>
    </div>
  );
}
