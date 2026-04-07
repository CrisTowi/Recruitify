'use client';

import { useState } from 'react';
import type { SessionQuestion } from '@/types';
import { scoreColorClass, formatScoreLabel } from './helpers';
import { useTranslations } from 'next-intl';
import styles from './SessionDebrief.module.css';

interface Props {
  question: SessionQuestion;
}

export default function QuestionRow({ question }: Props) {
  const t = useTranslations('session');
  const [expanded, setExpanded] = useState(false);

  return (
    <li className={styles.questionItem}>
      <button
        className={styles.questionToggle}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.questionLabel}>
          Q{question.question_number}
          {question.score !== null && (
            <span className={`${styles.qScore} ${scoreColorClass(question.score, styles)}`}>
              {formatScoreLabel(question.score)}
            </span>
          )}
        </span>
        <span className={styles.questionPreview}>{question.question_text}</span>
        <span className={styles.chevron} aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={styles.questionDetail}>
          <div className={styles.detailSection}>
            <p className={styles.detailLabel}>{t('questionDetail')}</p>
            <p className={styles.detailText}>{question.question_text}</p>
          </div>

          {question.answer_transcript && (
            <div className={styles.detailSection}>
              <p className={styles.detailLabel}>{t('yourAnswer')}</p>
              <p className={styles.detailText}>{question.answer_transcript}</p>
            </div>
          )}

          {question.feedback_strengths && (
            <div className={styles.detailSection}>
              <p className={`${styles.detailLabel} ${styles.strengthLabel}`}>{t('whatWorkedQuestion')}</p>
              <p className={styles.detailText}>{question.feedback_strengths}</p>
            </div>
          )}

          {question.feedback_improvements && (
            <div className={styles.detailSection}>
              <p className={`${styles.detailLabel} ${styles.improvementLabel}`}>{t('howToImproveQuestion')}</p>
              <p className={styles.detailText}>{question.feedback_improvements}</p>
            </div>
          )}

          {question.feedback_suggested_answer && (
            <div className={styles.detailSection}>
              <p className={styles.detailLabel}>{t('suggestedDirectionQuestion')}</p>
              <p className={styles.detailText}>{question.feedback_suggested_answer}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
