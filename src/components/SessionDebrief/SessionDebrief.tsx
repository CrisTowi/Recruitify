'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InterviewSessionFull } from '@/types';
import { scoreColorClass, generateDebrief, buildDebriefMarkdown, copyToClipboard } from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import QuestionRow from './QuestionRow';
import styles from './SessionDebrief.module.css';

interface Props {
  session: InterviewSessionFull;
  onRegenerated: (updated: InterviewSessionFull) => void;
}

export default function SessionDebrief({ session, onRegenerated }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const hasDebrief = session.debrief_summary !== null;

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      await generateDebrief(session.id);
      // Refetch the session with updated debrief data
      const res = await fetch(`/api/sessions/${session.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as InterviewSessionFull;
      onRegenerated(updated);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Failed to regenerate debrief');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy() {
    setCopying(true);
    try {
      await copyToClipboard(buildDebriefMarkdown(session));
      toast('Debrief copied to clipboard');
    } catch {
      toast('Failed to copy to clipboard');
    } finally {
      setCopying(false);
    }
  }

  function handleExportMarkdown() {
    const markdown = buildDebriefMarkdown(session);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debrief-${session.id.slice(0, 8)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const answeredQuestions = session.questions.filter((question) => question.answer_transcript !== null);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div>
            <h1 className={styles.heading}>Session Debrief</h1>
            <p className={styles.meta}>
              {answeredQuestions.length} question{answeredQuestions.length !== 1 ? 's' : ''} answered
              {session.completed_at && (
                <> · {new Date(session.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</>
              )}
            </p>
          </div>

          {session.overall_score !== null && (
            <div className={`${styles.overallScore} ${scoreColorClass(session.overall_score, styles)}`}>
              <span className={styles.overallScoreValue}>{session.overall_score.toFixed(1)}</span>
              <span className={styles.overallScoreLabel}>/10</span>
            </div>
          )}
        </div>

        {/* Summary */}
        {session.debrief_summary && (
          <p className={styles.summary}>{session.debrief_summary}</p>
        )}

        {!hasDebrief && !regenerating && (
          <div className={styles.noDebrief}>
            <p>Debrief not yet generated.</p>
            <button className={styles.regenButton} onClick={handleRegenerate}>
              Generate Debrief
            </button>
          </div>
        )}

        {regenerating && (
          <div className={styles.generating}>
            <div className={styles.spinner} aria-label="Generating debrief…" />
            <p>Generating debrief…</p>
          </div>
        )}

        {regenError && <p className={styles.errorText}>{regenError}</p>}

        {hasDebrief && (
          <>
            {/* Strengths */}
            {session.debrief_strengths.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Strengths</h2>
                <ul className={styles.list}>
                  {session.debrief_strengths.map((strength, index) => (
                    <li key={index} className={`${styles.listItem} ${styles.strengthItem}`}>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {session.debrief_improvements.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Areas to Improve</h2>
                <ul className={styles.list}>
                  {session.debrief_improvements.map((improvement, index) => (
                    <li key={index} className={`${styles.listItem} ${styles.improvementItem}`}>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resources */}
            {session.debrief_resources.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Suggested Resources</h2>
                <ul className={styles.list}>
                  {session.debrief_resources.map((resource, index) => (
                    <li key={index} className={styles.listItem}>{resource}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question breakdown */}
            {session.questions.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Question Breakdown</h2>
                <ol className={styles.questionList}>
                  {session.questions.map((question) => (
                    <QuestionRow key={question.id} question={question} />
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.backButton} onClick={() => router.push('/')}>
            ← Back to board
          </button>
          <div className={styles.actionsRight}>
            {hasDebrief && (
              <>
                <button
                  className={styles.exportButton}
                  onClick={handleCopy}
                  disabled={copying}
                  title="Copy debrief as Markdown"
                >
                  {copying ? 'Copying…' : 'Copy'}
                </button>
                <button
                  className={styles.exportButton}
                  onClick={handleExportMarkdown}
                  title="Download debrief as Markdown file"
                >
                  Export .md
                </button>
              </>
            )}
            {hasDebrief && (
              <button
                className={styles.regenButton}
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
