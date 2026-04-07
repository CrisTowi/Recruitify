'use client';

import { useTranslations } from 'next-intl';
import styles from './VoiceControls.module.css';

interface Props {
  isVoiceMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoadingTts: boolean;
  isSupported: boolean;
  disabled: boolean;
  canReplay: boolean;
  onToggleVoiceMode: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelSpeech: () => void;
  onReplay: () => void;
}

export default function VoiceControls({
  isVoiceMode,
  isListening,
  isSpeaking,
  isLoadingTts,
  isSupported,
  disabled,
  canReplay,
  onToggleVoiceMode,
  onStartListening,
  onStopListening,
  onCancelSpeech,
  onReplay,
}: Props) {
  const t = useTranslations('voiceControls');

  if (!isSupported) return null;

  return (
    <div className={styles.controls}>
      {/* Text / Voice toggle */}
      <button
        type="button"
        className={`${styles.modeToggle} ${isVoiceMode ? styles.modeToggleActive : ''}`}
        onClick={onToggleVoiceMode}
        disabled={disabled}
        title={isVoiceMode ? t('switchToText') : t('switchToVoice')}
      >
        {isVoiceMode ? t('textMode') : t('voiceMode')}
      </button>

      {/* Mic controls (voice mode only) */}
      {isVoiceMode && (
        <div className={styles.micRow}>
          <button
            type="button"
            className={`${styles.micButton} ${isListening ? styles.micButtonActive : ''}`}
            onClick={isListening ? onStopListening : onStartListening}
            disabled={disabled || isLoadingTts || isSpeaking}
            aria-pressed={isListening}
            title={isListening ? t('stopListening') : t('startListening')}
          >
            <span className={`${styles.micIcon} ${isListening ? styles.micPulse : ''}`} aria-hidden="true">
              🎙
            </span>
            <span>{isListening ? t('stop') : t('listen')}</span>
          </button>

          {isLoadingTts && (
            <div className={styles.loadingIndicator} role="status" aria-label={t('preparingAudio')}>
              <span className={styles.loadingDots} aria-hidden="true">
                <span /><span /><span />
              </span>
              <span className={styles.loadingLabel}>{t('preparingAudio')}</span>
            </div>
          )}

          {isListening && (
            <div className={styles.recordingIndicator} role="status" aria-label={t('recordingLabel')}>
              <span className={styles.recordingDot} aria-hidden="true" />
              <span className={styles.recordingLabel}>{t('recordingLabel')}</span>
            </div>
          )}

          {isSpeaking && (
            <div className={styles.speakingIndicator} role="status" aria-label={t('speakingLabel')}>
              <span className={styles.speakingDot} aria-hidden="true" />
              <span className={styles.speakingLabel}>{t('speakingLabel')}</span>
              <button
                type="button"
                className={styles.cancelSpeechButton}
                onClick={onCancelSpeech}
                title={t('stopSpeaking')}
              >
                ✕
              </button>
            </div>
          )}

          {canReplay && (
            <button
              type="button"
              className={styles.replayButton}
              onClick={onReplay}
              title={t('replayQuestion')}
            >
              {t('replay')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
