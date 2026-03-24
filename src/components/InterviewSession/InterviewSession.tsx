'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AISettings, InterviewSessionFull } from '@/types';
import FeedbackCard from '@/components/FeedbackCard/FeedbackCard';
import type { FeedbackData } from '@/components/FeedbackCard/FeedbackCard';
import VoiceControls from '@/components/VoiceControls/VoiceControls';
import Skeleton from '@/components/Skeleton/Skeleton';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useDeepgramStreaming } from '@/hooks/useDeepgramStreaming';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useDebounce } from '@/hooks/useDebounce';
import {
  startSession,
  submitAnswer,
  completeSession,
  cancelSession,
  formatElapsed,
  fetchSessionAISettings,
  isCloudTtsProvider,
  isCloudSttProvider,
  speakWithCloudTts,
  classifyError,
} from './helpers';
import type { CurrentQuestion, ClassifiedError } from './helpers';
import styles from './InterviewSession.module.css';

interface Props {
  session: InterviewSessionFull;
}

type Phase = 'starting' | 'answering' | 'feedback' | 'submitting' | 'completing' | 'error';

export default function InterviewSession({ session }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string | null>(null);
  const [beginAttempt, setBeginAttempt] = useState(0);
  const [errorBanner, setErrorBanner] = useState<ClassifiedError | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeakingCloud, setIsSpeakingCloud] = useState(false);
  const [isLoadingTts, setIsLoadingTts] = useState(false);
  const [hasAudioCached, setHasAudioCached] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<CurrentQuestion | null>(null);

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAudioUrlRef = useRef<string | null>(null);

  const stt = useSpeechRecognition();
  const deepgramStt = useDeepgramStreaming();
  const tts = useSpeechSynthesis();

  const useCloudTts = isCloudTtsProvider(aiSettings?.tts_provider);
  const useCloudStt = isCloudSttProvider(aiSettings?.stt_provider);
  const activeStt = useCloudStt ? deepgramStt : stt;

  const debouncedTranscript = useDebounce(activeStt.transcript, 150);

  const isSpeaking = useCloudTts ? isSpeakingCloud : tts.isSpeaking;
  const ttsSpeakFn = tts.speak;

  // Load AI settings on mount
  useEffect(() => {
    async function load() {
      const settings = await fetchSessionAISettings();
      setAiSettings(settings);
    }
    load();
  }, []);

  // Sync debounced STT transcript to answer in voice mode
  useEffect(() => {
    if (isVoiceMode) {
      setAnswer(debouncedTranscript);
    }
  }, [isVoiceMode, debouncedTranscript]);

  // Announce new questions to screen readers
  useEffect(() => {
    if (currentQuestion && phase === 'answering') {
      setLiveAnnouncement(`Question ${currentQuestion.question_number}: ${currentQuestion.question_text}`);
    }
    if (phase === 'feedback' && currentQuestion) {
      setLiveAnnouncement(`Feedback received for question ${currentQuestion.question_number}.`);
    }
  }, [currentQuestion, phase]);

  // Speak question aloud when it changes in voice mode
  useEffect(() => {
    if (!isVoiceMode || !currentQuestion || phase !== 'answering') return;

    async function speakQuestion() {
      if (!currentQuestion) return;

      if (useCloudTts) {
        setIsLoadingTts(true);
        setHasAudioCached(false);
        if (lastAudioUrlRef.current) {
          URL.revokeObjectURL(lastAudioUrlRef.current);
          lastAudioUrlRef.current = null;
        }
        try {
          const audio = await speakWithCloudTts(currentQuestion.question_text, aiSettings?.tts_voice_id);
          lastAudioUrlRef.current = audio.src;
          setHasAudioCached(true);
          cloudAudioRef.current = audio;
          audio.onended = () => {
            setIsSpeakingCloud(false);
            cloudAudioRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeakingCloud(false);
            cloudAudioRef.current = null;
          };
          setIsLoadingTts(false);
          await audio.play();
          setIsSpeakingCloud(true);
        } catch {
          setIsLoadingTts(false);
          setIsSpeakingCloud(false);
          cloudAudioRef.current = null;
        }
      } else {
        ttsSpeakFn(currentQuestion.question_text);
      }
    }

    speakQuestion();
  }, [currentQuestion, isVoiceMode, phase, useCloudTts, aiSettings?.tts_voice_id, ttsSpeakFn]);

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

  const cancelSpeech = useCallback(() => {
    tts.cancel();
    if (cloudAudioRef.current) {
      cloudAudioRef.current.pause();
      cloudAudioRef.current = null;
    }
    setIsSpeakingCloud(false);
    setIsLoadingTts(false);
  }, [tts]);

  const handleReplay = useCallback(() => {
    if (useCloudTts) {
      if (!lastAudioUrlRef.current) return;
      const audio = new Audio(lastAudioUrlRef.current);
      cloudAudioRef.current = audio;
      audio.onended = () => { setIsSpeakingCloud(false); cloudAudioRef.current = null; };
      audio.onerror = () => { setIsSpeakingCloud(false); cloudAudioRef.current = null; };
      void (async () => {
        try {
          await audio.play();
          setIsSpeakingCloud(true);
        } catch {
          setIsSpeakingCloud(false);
          cloudAudioRef.current = null;
        }
      })();
    } else if (currentQuestion) {
      ttsSpeakFn(currentQuestion.question_text);
    }
  }, [useCloudTts, currentQuestion, ttsSpeakFn]);

  // Begin or resume the interview on mount (re-runs on beginAttempt change for retry)
  useEffect(() => {
    async function begin() {
      try {
        let questionResult: CurrentQuestion;

        if (session.status === 'configuring') {
          const result = await startSession(session.id);
          questionResult = result.current_question;
        } else {
          const res = await fetch(`/api/sessions/${session.id}`);
          if (!res.ok) {
            const json = await res.json() as { error?: string; code?: string };
            throw new Error(json.error ?? `HTTP ${res.status}`);
          }
          const full = await res.json() as InterviewSessionFull;
          const unanswered = full.questions.find((question) => question.answer_transcript === null);
          if (unanswered) {
            questionResult = {
              id: unanswered.id,
              question_number: unanswered.question_number,
              question_text: unanswered.question_text,
            };
          } else if (full.questions.length === 0) {
            // Session status was set to in_progress locally before DB was updated — treat as fresh start
            const result = await startSession(session.id);
            questionResult = result.current_question;
          } else {
            router.push(`/session/${session.id}/debrief`);
            return;
          }
        }

        setCurrentQuestion(questionResult);

        // Restore any answer the user had typed before navigating away
        const savedAnswer = sessionStorage.getItem(`interview_answer_${session.id}_${questionResult.id}`);
        if (savedAnswer) setAnswer(savedAnswer);

        setPhase('answering');
        startTimer();
      } catch (err) {
        const classified = classifyError(err);
        setError(classified.message);
        setPhase('error');
      }
    }
    begin();

    return () => stopTimer();
  }, [session.id, session.status, router, startTimer, stopTimer, beginAttempt]);

  const handleToggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      activeStt.stopListening();
      cancelSpeech();
    }
    setIsVoiceMode((prev) => !prev);
  }, [isVoiceMode, activeStt, cancelSpeech]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !answer.trim()) return;

    setErrorBanner(null);
    stopTimer();
    activeStt.stopListening();
    cancelSpeech();
    setPhase('submitting');

    const duration = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    try {
      const result = await submitAnswer(session.id, currentQuestion.id, answer.trim(), duration);

      // Clear saved draft for this question
      sessionStorage.removeItem(`interview_answer_${session.id}_${currentQuestion.id}`);

      if (result.session_complete) {
        setPhase('completing');
        await completeSession(session.id);
        router.push(`/session/${session.id}/debrief`);
        return;
      }

      if (session.feedback_mode === 'immediate' && result.feedback) {
        setFeedback(result.feedback);
        setIsLastQuestion(result.next_question === undefined);
        setPendingNextQuestion(result.next_question ?? null);
        setPhase('feedback');
      } else {
        if (result.next_question) {
          setCurrentQuestion(result.next_question);
          setIsLastQuestion(result.is_last_question ?? false);
          setAnswer('');
          activeStt.resetTranscript();
          setPhase('answering');
          startTimer();
        }
      }
    } catch (err) {
      const classified = classifyError(err);
      if (classified.retryable) {
        setErrorBanner(classified);
        setPhase('answering');
      } else {
        setError(classified.message);
        setPhase('error');
      }
    }
  }, [answer, activeStt, cancelSpeech, currentQuestion, router, session.feedback_mode, session.id, startTimer, stopTimer]);

  const handleNextQuestion = useCallback(async () => {
    if (isLastQuestion) {
      setPhase('completing');
      try {
        await completeSession(session.id);
        router.push(`/session/${session.id}/debrief`);
      } catch (err) {
        const classified = classifyError(err);
        setError(classified.message);
        setPhase('error');
      }
      return;
    }

    if (pendingNextQuestion) {
      setCurrentQuestion(pendingNextQuestion);
      setPendingNextQuestion(null);
      setFeedback(null);
      setAnswer('');
      activeStt.resetTranscript();
      setPhase('answering');
      startTimer();
    }
  }, [isLastQuestion, pendingNextQuestion, router, session.id, startTimer, activeStt]);

  const handleEndEarly = useCallback(async () => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }
    stopTimer();
    cancelSpeech();
    setPhase('completing');
    try {
      await completeSession(session.id);
      router.push(`/session/${session.id}/debrief`);
    } catch (err) {
      const classified = classifyError(err);
      setError(classified.message);
      setPhase('error');
    }
  }, [cancelSpeech, router, session.id, showCancelConfirm, stopTimer]);

  const handleCancel = useCallback(async () => {
    stopTimer();
    cancelSpeech();
    try {
      await cancelSession(session.id);
      router.push('/');
    } catch {
      router.push('/');
    }
  }, [cancelSpeech, router, session.id, stopTimer]);

  const handleTextareaChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setAnswer(value);
    if (currentQuestion) {
      sessionStorage.setItem(`interview_answer_${session.id}_${currentQuestion.id}`, value);
    }
  }, [currentQuestion, session.id]);

  const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmitAnswer();
    }
  }, [handleSubmitAnswer]);

  if (phase === 'error') {
    return (
      <div className={styles.state}>
        <p className={styles.errorText}>{error ?? 'An error occurred.'}</p>
        <button
          className={styles.retryButton}
          onClick={() => {
            setError(null);
            setPhase('starting');
            setBeginAttempt((prev) => prev + 1);
          }}
        >
          Try again
        </button>
        <button className={styles.backButton} onClick={() => router.push('/')}>Back to board</button>
      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonCard}>
          <div className={styles.header}>
            <Skeleton width={140} height={14} />
            <Skeleton width={44} height={14} />
          </div>
          <div className={styles.skeletonQuestionBlock}>
            <Skeleton height={14} />
            <Skeleton height={14} width="92%" />
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="88%" />
          </div>
          <Skeleton width="100%" height={140} />
        </div>
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

  const voiceSupported = activeStt.isSupported;
  const canReplay = isVoiceMode && !isSpeaking && !isLoadingTts && currentQuestion !== null && phase === 'answering' && (useCloudTts ? hasAudioCached : true);

  return (
    <div className={styles.container}>
      {/* Screen reader live region */}
      <div aria-live="assertive" aria-atomic="true" className={styles.srOnly}>
        {liveAnnouncement}
      </div>

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
            <VoiceControls
              isVoiceMode={isVoiceMode}
              isListening={activeStt.isListening}
              isSpeaking={isSpeaking}
              isLoadingTts={isLoadingTts}
              isSupported={voiceSupported}
              disabled={phase === 'submitting'}
              canReplay={canReplay}
              onToggleVoiceMode={handleToggleVoiceMode}
              onStartListening={activeStt.startListening}
              onStopListening={activeStt.stopListening}
              onCancelSpeech={cancelSpeech}
              onReplay={handleReplay}
            />

            {/* Inline error banner (retryable errors only) */}
            {errorBanner && (
              <div className={styles.errorBanner} role="alert">
                <p className={styles.errorBannerMessage}>{errorBanner.message}</p>
                <button className={styles.retryButton} onClick={handleSubmitAnswer}>
                  Retry
                </button>
              </div>
            )}

            <textarea
              className={styles.textarea}
              value={answer}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={isVoiceMode ? 'Your spoken answer will appear here…' : 'Type your answer here… (⌘↵ to submit)'}
              rows={6}
              disabled={phase === 'submitting'}
              aria-label="Your answer"
            />

            {/* Interim transcript */}
            {isVoiceMode && activeStt.interimTranscript && (
              <p className={styles.interimText}>
                <span className={styles.interimDot} aria-hidden="true" />
                {activeStt.interimTranscript}
              </p>
            )}

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
