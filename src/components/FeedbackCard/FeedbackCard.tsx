'use client';

import { useTranslations } from 'next-intl';
import styles from './FeedbackCard.module.css';

export interface FeedbackData {
  score: number | null;
  strengths: string | null;
  improvements: string | null;
  suggested_answer: string | null;
}

interface Props {
  feedback: FeedbackData;
  questionNumber: number;
  onNext: () => void;
  isLast: boolean;
}

export default function FeedbackCard({ feedback, questionNumber, onNext, isLast }: Props) {
  const t = useTranslations('session');
  const scoreClass =
    feedback.score === null ? '' :
    feedback.score >= 8 ? styles.scoreHigh :
    feedback.score >= 5 ? styles.scoreMid :
    styles.scoreLow;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{t('feedbackLabel', { number: questionNumber })}</span>
        {feedback.score !== null && (
          <span className={`${styles.score} ${scoreClass}`}>{feedback.score}/10</span>
        )}
      </div>

      {feedback.strengths && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t('whatWorked')}</p>
          <p className={styles.sectionBody}>{feedback.strengths}</p>
        </div>
      )}

      {feedback.improvements && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t('howToImprove')}</p>
          <p className={styles.sectionBody}>{feedback.improvements}</p>
        </div>
      )}

      {feedback.suggested_answer && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t('suggestedDirection')}</p>
          <p className={styles.sectionBody}>{feedback.suggested_answer}</p>
        </div>
      )}

      <button className={styles.nextButton} onClick={onNext}>
        {isLast ? t('viewDebrief') : t('nextQuestion')}
      </button>
    </div>
  );
}
