'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyWithNextStep, InterviewStage, FeedbackMode, Difficulty, InterviewSession } from '@/types';
import {
  PERSONA_PRESETS,
  DIFFICULTY_OPTIONS,
  FEEDBACK_MODE_OPTIONS,
  FOCUS_AREA_SUGGESTIONS,
  fetchActiveSession,
  cancelSessionById,
  createSession,
} from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import styles from './SimulationConfigModal.module.css';

interface Props {
  company: CompanyWithNextStep;
  stage: InterviewStage;
  onClose: () => void;
}

export default function SimulationConfigModal({ company, stage, onClose }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [numQuestions, setNumQuestions] = useState(5);
  const [personaPreset, setPersonaPreset] = useState(PERSONA_PRESETS[0].value);
  const [personaCustom, setPersonaCustom] = useState('');
  const [isCustomPersona, setIsCustomPersona] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [focusInput, setFocusInput] = useState('');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('immediate');
  const [submitting, setSubmitting] = useState(false);
  const [hasAIKey, setHasAIKey] = useState<boolean | null>(null);
  const [activeSession, setActiveSession] = useState<InterviewSession | null | undefined>(undefined);
  const [discarding, setDiscarding] = useState(false);

  const focusInputRef = useRef<HTMLInputElement>(null);

  // Check AI settings and active session on mount
  useEffect(() => {
    async function checkOnMount() {
      try {
        const [aiRes, session] = await Promise.all([
          fetch('/api/ai-settings'),
          fetchActiveSession(),
        ]);
        if (aiRes.status === 404 || !aiRes.ok) {
          setHasAIKey(false);
        } else {
          const data = await aiRes.json() as { has_llm_key: boolean };
          setHasAIKey(data.has_llm_key);
        }
        setActiveSession(session);
      } catch {
        setHasAIKey(false);
        setActiveSession(null);
      }
    }
    checkOnMount();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handlePersonaPresetChange(value: string) {
    const isCustom = value === '';
    setIsCustomPersona(isCustom);
    setPersonaPreset(value);
    if (!isCustom) setPersonaCustom('');
  }

  function addFocusArea(area: string) {
    const trimmed = area.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      setFocusAreas((prev) => [...prev, trimmed]);
    }
    setFocusInput('');
  }

  function handleFocusKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addFocusArea(focusInput);
    } else if (event.key === 'Backspace' && focusInput === '' && focusAreas.length > 0) {
      setFocusAreas((prev) => prev.slice(0, -1));
    }
  }

  function removeFocusArea(area: string) {
    setFocusAreas((prev) => prev.filter((focusArea) => focusArea !== area));
  }

  async function handleDiscardAndStartNew() {
    if (!activeSession) return;
    setDiscarding(true);
    try {
      await cancelSessionById(activeSession.id);
      setActiveSession(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discard session';
      toast(message);
    } finally {
      setDiscarding(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const persona = isCustomPersona ? personaCustom.trim() || null : personaPreset || null;
      const session = await createSession({
        company_id: company.id,
        stage_id: stage.id,
        feedback_mode: feedbackMode,
        num_questions: numQuestions,
        interviewer_persona: persona,
        difficulty,
        focus_areas: focusAreas,
      });
      router.push(`/session/${session.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      toast(message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-config-title"
      >
        <div className={styles.header}>
          <h2 id="sim-config-title" className={styles.title}>Simulate Interview</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Context — read only */}
        <div className={styles.context}>
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Company</span>
            <span className={styles.contextValue}>{company.name}</span>
          </div>
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Stage</span>
            <span className={styles.contextValue}>{stage.stage_name}</span>
          </div>
          {company.prep_notes && (
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>Prep notes</span>
              <span className={`${styles.contextValue} ${styles.contextNotes}`}>{company.prep_notes}</span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {activeSession === undefined && (
          <p className={styles.loadingText}>Checking for active sessions…</p>
        )}

        {/* Active session conflict */}
        {activeSession !== undefined && activeSession !== null && (
          <div className={styles.conflictBanner}>
            <p className={styles.conflictMessage}>
              You have an active simulation in progress. Continue where you left off, or discard it to start a new one.
            </p>
            {activeSession.started_at && (
              <p className={styles.conflictMeta}>
                Started {new Date(activeSession.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <div className={styles.conflictActions}>
              <button
                type="button"
                className={styles.discardButton}
                onClick={handleDiscardAndStartNew}
                disabled={discarding}
              >
                {discarding ? 'Discarding…' : 'Discard & start new'}
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={() => router.push(`/session/${activeSession.id}`)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Config form — only shown when no active session */}
        {activeSession === null && (
          <>
            {/* AI key guard */}
            {hasAIKey === false && (
              <div className={styles.aiWarning}>
                No AI key configured. Set up your provider in <strong>AI Settings</strong> before starting.
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
          {/* Number of questions */}
          <div className={styles.field}>
            <label className={styles.label}>
              Questions <span className={styles.labelCount}>{numQuestions}</span>
            </label>
            <input
              type="range"
              className={styles.slider}
              min={1}
              max={15}
              value={numQuestions}
              onChange={(event) => setNumQuestions(Number(event.target.value))}
              disabled={submitting}
            />
            <div className={styles.sliderRange}>
              <span>1</span><span>15</span>
            </div>
          </div>

          {/* Difficulty */}
          <div className={styles.field}>
            <span className={styles.label}>Difficulty</span>
            <div className={styles.segmented}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.segmentedOption} ${difficulty === option.value ? styles.segmentedOptionActive : ''}`}
                  onClick={() => setDifficulty(option.value)}
                  disabled={submitting}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback mode */}
          <div className={styles.field}>
            <span className={styles.label}>Feedback mode</span>
            <div className={styles.segmented}>
              {FEEDBACK_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.segmentedOption} ${feedbackMode === option.value ? styles.segmentedOptionActive : ''}`}
                  onClick={() => setFeedbackMode(option.value)}
                  disabled={submitting}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interviewer persona */}
          <div className={styles.field}>
            <label htmlFor="sim-persona-preset" className={styles.label}>Interviewer persona</label>
            <select
              id="sim-persona-preset"
              className={styles.select}
              value={isCustomPersona ? '' : personaPreset}
              onChange={(event) => handlePersonaPresetChange(event.target.value)}
              disabled={submitting}
            >
              {PERSONA_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value}>{preset.label}</option>
              ))}
            </select>
            {isCustomPersona && (
              <input
                type="text"
                className={`${styles.input} ${styles.personaInput}`}
                placeholder="Describe the interviewer role and style…"
                value={personaCustom}
                onChange={(event) => setPersonaCustom(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            )}
          </div>

          {/* Focus areas */}
          <div className={styles.field}>
            <label htmlFor="sim-focus" className={styles.label}>Focus areas <span className={styles.optional}>(optional)</span></label>
            <div className={styles.tagInput} onClick={() => focusInputRef.current?.focus()}>
              {focusAreas.map((area) => (
                <span key={area} className={styles.tag}>
                  {area}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={(event) => { event.stopPropagation(); removeFocusArea(area); }}
                    aria-label={`Remove ${area}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                ref={focusInputRef}
                id="sim-focus"
                type="text"
                className={styles.tagInputField}
                value={focusInput}
                onChange={(event) => setFocusInput(event.target.value)}
                onKeyDown={handleFocusKeyDown}
                onBlur={() => { if (focusInput.trim()) addFocusArea(focusInput); }}
                placeholder={focusAreas.length === 0 ? 'Type and press Enter…' : ''}
                disabled={submitting}
              />
            </div>
            <div className={styles.suggestions}>
              {FOCUS_AREA_SUGGESTIONS.filter((suggestion) => !focusAreas.includes(suggestion)).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => addFocusArea(suggestion)}
                  disabled={submitting}
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || hasAIKey === false}
            >
              {submitting ? 'Starting…' : 'Start Session'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
