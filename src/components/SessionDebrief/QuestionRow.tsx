'use client';

import { useState } from 'react';
import type { SessionQuestion } from '@/types';
import { scoreColorClass, formatScoreLabel } from './helpers';
import styles from './SessionDebrief.module.css';

interface Props {
  question: SessionQuestion;
}

export default function QuestionRow({ question }: Props) {
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
            <p className={styles.detailLabel}>Question</p>
            <p className={styles.detailText}>{question.question_text}</p>
          </div>

          {question.answer_transcript && (
            <div className={styles.detailSection}>
              <p className={styles.detailLabel}>Your answer</p>
              <p className={styles.detailText}>{question.answer_transcript}</p>
            </div>
          )}

          {question.feedback_strengths && (
            <div className={styles.detailSection}>
              <p className={`${styles.detailLabel} ${styles.strengthLabel}`}>What worked</p>
              <p className={styles.detailText}>{question.feedback_strengths}</p>
            </div>
          )}

          {question.feedback_improvements && (
            <div className={styles.detailSection}>
              <p className={`${styles.detailLabel} ${styles.improvementLabel}`}>How to improve</p>
              <p className={styles.detailText}>{question.feedback_improvements}</p>
            </div>
          )}

          {question.feedback_suggested_answer && (
            <div className={styles.detailSection}>
              <p className={styles.detailLabel}>Suggested direction</p>
              <p className={styles.detailText}>{question.feedback_suggested_answer}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
