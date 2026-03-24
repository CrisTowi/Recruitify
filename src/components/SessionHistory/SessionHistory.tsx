'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InterviewSession } from '@/types';
import {
  fetchSessionsForCompany,
  formatSessionDate,
  scoreColorClass,
  buildSparklinePath,
} from './helpers';
import Skeleton from '@/components/Skeleton/Skeleton';
import styles from './SessionHistory.module.css';

interface Props {
  companyId: string;
}

const SPARKLINE_WIDTH = 80;
const SPARKLINE_HEIGHT = 28;

export default function SessionHistory({ companyId }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchSessionsForCompany(companyId);
      setSessions(data);
      setLoading(false);
    }
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className={styles.container}>
        {[1, 2, 3].map((index) => (
          <div key={index} className={styles.item}>
            <div className={styles.itemButton} style={{ pointerEvents: 'none' }}>
              <div className={styles.itemLeft} style={{ gap: 6, width: '60%' }}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={12} width="50%" />
              </div>
              <div className={styles.itemRight}>
                <Skeleton height={22} width={72} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No simulation sessions yet.</p>
        <p className={styles.emptyHint}>Click &ldquo;Simulate&rdquo; on any stage to start practicing.</p>
      </div>
    );
  }

  const completedScores = sessions
    .filter((session) => session.status === 'completed' && session.overall_score !== null)
    .map((session) => session.overall_score as number);

  const showSparkline = completedScores.length >= 3;
  const sparklinePath = showSparkline ? buildSparklinePath(completedScores, SPARKLINE_WIDTH, SPARKLINE_HEIGHT) : '';

  return (
    <div className={styles.container}>
      {showSparkline && (
        <div className={styles.trendRow}>
          <span className={styles.trendLabel}>Score trend</span>
          <svg
            width={SPARKLINE_WIDTH}
            height={SPARKLINE_HEIGHT}
            viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
            className={styles.sparkline}
            aria-label="Score trend over sessions"
          >
            <path d={sparklinePath} className={styles.sparklinePath} fill="none" strokeWidth="2" />
          </svg>
        </div>
      )}

      <ol className={styles.list}>
        {sessions.map((session) => (
          <li key={session.id} className={styles.item}>
            <button
              className={styles.itemButton}
              onClick={() => {
                if (session.status === 'completed') {
                  router.push(`/session/${session.id}/debrief`);
                } else {
                  router.push(`/session/${session.id}`);
                }
              }}
            >
              <div className={styles.itemLeft}>
                <span className={styles.itemDate}>{formatSessionDate(session.created_at)}</span>
                <span className={styles.itemMeta}>
                  {session.num_questions}Q · {session.difficulty} · {session.feedback_mode === 'immediate' ? 'Immediate' : 'Simulation'}
                </span>
              </div>

              <div className={styles.itemRight}>
                <span className={`${styles.statusBadge} ${styles[`status_${session.status}`]}`}>
                  {session.status.replace('_', ' ')}
                </span>
                {session.overall_score !== null && (
                  <span className={`${styles.scoreBadge} ${scoreColorClass(session.overall_score, styles)}`}>
                    {session.overall_score.toFixed(1)}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
