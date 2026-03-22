'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { InterviewSessionFull } from '@/types';
import FeedbackCard from '@/components/FeedbackCard/FeedbackCard';
import type { FeedbackData } from '@/components/FeedbackCard/FeedbackCard';
import {
  startSession,
  submitAnswer,
  completeSession,
  cancelSession,
  formatElapsed,
} from './helpers';
import type { CurrentQuestion } from './helpers';
import styles from './InterviewSession.module.css';

interface Props {
  session: InterviewSessionFull;
}

type Phase = 'starting' | 'answering' | 'feedback' | 'submitting' | 'completing' | 'error';

export default function InterviewSession({ session }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    questionStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Begin or resume the interview on mount
  useEffect(() => {
    async function begin() {
      try {
        if (session.status === 'configuring') {
          // Fresh start — call /start to get the first question
          const result = await startSession(session.id);
          setCurrentQuestion(result.current_question);
        } else {
          // Resuming an in_progress session — find the last unanswered question
          const res = await fetch(`/api/sessions/${session.id}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const full = await res.json() as InterviewSessionFull;
          const unanswered = full.questions.find((question) => question.answer_transcript === null);
          if (unanswered) {
            setCurrentQuestion({
              id: unanswered.id,
              question_number: unanswered.question_number,
              question_text: unanswered.question_text,
            });
          } else if (full.questions.length > 0) {
            // All answered — go to debrief
            router.push(`/session/${session.id}/debrief`);
            return;
          }
        }
        setPhase('answering');
        startTimer();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session');
        setPhase('error');
      }
    }
    begin();

    return () => stopTimer();
  }, [session.id, session.status, router, startTimer, stopTimer]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !answer.trim()) return;

    stopTimer();
    setPhase('submitting');

    const duration = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    try {
      const result = await submitAnswer(session.id, currentQuestion.id, answer.trim(), duration);

      if (result.session_complete) {
        setPhase('completing');
        await completeSession(session.id);
        router.push(`/session/${session.id}/debrief`);
        return;
      }

      if (session.feedback_mode === 'immediate' && result.feedback) {
        setFeedback(result.feedback);
        setIsLastQuestion(result.next_question === undefined ? true : (result.is_last_question ?? false));
        setPhase('feedback');
      } else {
        // Full simulation mode — advance directly
        if (result.next_question) {
          setCurrentQuestion(result.next_question);
          setIsLastQuestion(result.is_last_question ?? false);
          setAnswer('');
          setPhase('answering');
          startTimer();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
      setPhase('error');
    }
  }, [answer, currentQuestion, router, session.feedback_mode, session.id, startTimer, stopTimer]);

  const handleNextQuestion = useCallback(async () => {
    if (isLastQuestion) {
      setPhase('completing');
      try {
        await completeSession(session.id);
        router.push(`/session/${session.id}/debrief`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete session');
        setPhase('error');
      }
      return;
    }

    // The next question was already created during the answer submission
    // Fetch updated session to get it
    try {
      const res = await fetch(`/api/sessions/${session.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as InterviewSessionFull;
      const nextQ = updated.questions[updated.questions.length - 1];
      if (nextQ && !nextQ.answer_transcript) {
        setCurrentQuestion({
          id: nextQ.id,
          question_number: nextQ.question_number,
          question_text: nextQ.question_text,
        });
        setFeedback(null);
        setAnswer('');
        setPhase('answering');
        startTimer();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load next question');
      setPhase('error');
    }
  }, [isLastQuestion, router, session.id, startTimer]);

  const handleEndEarly = useCallback(async () => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }
    stopTimer();
    setPhase('completing');
    try {
      await completeSession(session.id);
      router.push(`/session/${session.id}/debrief`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
      setPhase('error');
    }
  }, [router, session.id, showCancelConfirm, stopTimer]);

  const handleCancel = useCallback(async () => {
    stopTimer();
    try {
      await cancelSession(session.id);
      router.push('/');
    } catch {
      router.push('/');
    }
  }, [router, session.id, stopTimer]);

  if (phase === 'error') {
    return (
      <div className={styles.state}>
        <p className={styles.errorText}>{error ?? 'An error occurred.'}</p>
        <button className={styles.backButton} onClick={() => router.push('/')}>Back to board</button>
      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className={styles.state}>
        <div className={styles.spinner} aria-label="Starting interview…" />
        <p>Starting interview…</p>
      </div>
    );
  }

  if (phase === 'completing') {
    return (
      <div className={styles.state}>
        <div className={styles.spinner} aria-label="Completing session…" />
        <p>Wrapping up…</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.progress}>
            {currentQuestion && (
              <span className={styles.counter}>
                Question {currentQuestion.question_number} of {session.num_questions}
              </span>
            )}
          </div>
          <span className={styles.timer}>{formatElapsed(elapsedSeconds)}</span>
        </div>

        {/* Question */}
        {currentQuestion && phase !== 'feedback' && (
          <div className={styles.questionBox}>
            <p className={styles.questionText}>{currentQuestion.question_text}</p>
          </div>
        )}

        {/* Feedback (immediate mode) */}
        {phase === 'feedback' && feedback && currentQuestion && (
          <FeedbackCard
            feedback={feedback}
            questionNumber={currentQuestion.question_number}
            onNext={handleNextQuestion}
            isLast={isLastQuestion}
          />
        )}

        {/* Answer area */}
        {(phase === 'answering' || phase === 'submitting') && (
          <div className={styles.answerArea}>
            <textarea
              className={styles.textarea}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer here…"
              rows={6}
              disabled={phase === 'submitting'}
            />
            <div className={styles.answerActions}>
              <button
                className={styles.submitButton}
                onClick={handleSubmitAnswer}
                disabled={phase === 'submitting' || !answer.trim()}
              >
                {phase === 'submitting' ? 'Submitting…' : 'Submit Answer'}
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {phase !== 'feedback' && (
          <div className={styles.footer}>
            {showCancelConfirm ? (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>End interview and go to debrief?</span>
                <button className={styles.cancelButton} onClick={() => setShowCancelConfirm(false)}>
                  Keep going
                </button>
                <button className={styles.endButton} onClick={handleEndEarly}>
                  Yes, end now
                </button>
              </div>
            ) : (
              <>
                <button className={styles.cancelButton} onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  className={styles.endButton}
                  onClick={handleEndEarly}
                  disabled={phase === 'submitting'}
                >
                  End Interview
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
