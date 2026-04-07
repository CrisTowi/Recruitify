'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FeedbackMode, Difficulty } from '@/types';
import {
  PERSONA_PRESETS,
  DIFFICULTY_OPTIONS,
  FEEDBACK_MODE_OPTIONS,
  FOCUS_AREA_SUGGESTIONS,
  createDryRunSession,
} from './helpers';
import { useToast } from '@/components/Toast/ToastProvider';
import { useTranslations } from 'next-intl';
import styles from '@/components/SimulationConfigModal/SimulationConfigModal.module.css';

interface Props {
  onClose: () => void;
}

export default function DryRunConfigModal({ onClose }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('session');
  const tCommon = useTranslations('common');

  const [dryRunContext, setDryRunContext] = useState('');
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

  const focusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkAIKey() {
      try {
        const res = await fetch('/api/ai-settings');
        if (res.status === 404 || !res.ok) {
          setHasAIKey(false);
        } else {
          const data = await res.json() as { has_llm_key: boolean };
          setHasAIKey(data.has_llm_key);
        }
      } catch {
        setHasAIKey(false);
      }
    }
    checkAIKey();
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const persona = isCustomPersona ? personaCustom.trim() || null : personaPreset || null;
      const session = await createDryRunSession({
        dry_run_context: dryRunContext.trim() || null,
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
        aria-labelledby="dry-run-config-title"
      >
        <div className={styles.header}>
          <h2 id="dry-run-config-title" className={styles.title}>{t('practiceTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('cancel')}>✕</button>
        </div>

        {hasAIKey === false && (
          <div className={styles.aiWarning}>
            {t('noAIKey')}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Job role / context */}
          <div className={styles.field}>
            <label htmlFor="dry-run-context" className={styles.label}>
              {t('jobRoleContext')} <span className={styles.optional}>{tCommon('optional')}</span>
            </label>
            <textarea
              id="dry-run-context"
              className={styles.input}
              rows={3}
              placeholder={t('jobRolePlaceholder')}
              value={dryRunContext}
              onChange={(event) => setDryRunContext(event.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Number of questions */}
          <div className={styles.field}>
            <label className={styles.label}>
              {t('questions')} <span className={styles.labelCount}>{numQuestions}</span>
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
            <span className={styles.label}>{t('difficulty')}</span>
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
            <span className={styles.label}>{t('feedbackMode')}</span>
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
            <label htmlFor="dry-run-persona-preset" className={styles.label}>{t('interviewerPersona')}</label>
            <select
              id="dry-run-persona-preset"
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
                placeholder={t('describeInterviewer')}
                value={personaCustom}
                onChange={(event) => setPersonaCustom(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            )}
          </div>

          {/* Focus areas */}
          <div className={styles.field}>
            <label htmlFor="dry-run-focus" className={styles.label}>{t('focusAreas')} <span className={styles.optional}>{tCommon('optional')}</span></label>
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
                id="dry-run-focus"
                type="text"
                className={styles.tagInputField}
                value={focusInput}
                onChange={(event) => setFocusInput(event.target.value)}
                onKeyDown={handleFocusKeyDown}
                onBlur={() => { if (focusInput.trim()) addFocusArea(focusInput); }}
                placeholder={focusAreas.length === 0 ? t('typeAndPressEnter') : ''}
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
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || hasAIKey === false}
            >
              {submitting ? t('starting') : t('startPractice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
