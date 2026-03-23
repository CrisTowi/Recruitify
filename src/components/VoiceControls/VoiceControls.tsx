'use client';

import styles from './VoiceControls.module.css';

interface Props {
  isVoiceMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  disabled: boolean;
  onToggleVoiceMode: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelSpeech: () => void;
}

export default function VoiceControls({
  isVoiceMode,
  isListening,
  isSpeaking,
  isSupported,
  disabled,
  onToggleVoiceMode,
  onStartListening,
  onStopListening,
  onCancelSpeech,
}: Props) {
  if (!isSupported) return null;

  return (
    <div className={styles.controls}>
      {/* Text / Voice toggle */}
      <button
        type="button"
        className={`${styles.modeToggle} ${isVoiceMode ? styles.modeToggleActive : ''}`}
        onClick={onToggleVoiceMode}
        disabled={disabled}
        title={isVoiceMode ? 'Switch to text input' : 'Switch to voice input'}
      >
        {isVoiceMode ? '⌨ Text mode' : '🎙 Voice mode'}
      </button>

      {/* Mic controls (voice mode only) */}
      {isVoiceMode && (
        <div className={styles.micRow}>
          <button
            type="button"
            className={`${styles.micButton} ${isListening ? styles.micButtonActive : ''}`}
            onClick={isListening ? onStopListening : onStartListening}
            disabled={disabled}
            aria-pressed={isListening}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <span className={`${styles.micIcon} ${isListening ? styles.micPulse : ''}`} aria-hidden="true">
              🎙
            </span>
            <span>{isListening ? 'Stop' : 'Listen'}</span>
          </button>

          {isListening && (
            <div className={styles.recordingIndicator} role="status" aria-label="Recording">
              <span className={styles.recordingDot} aria-hidden="true" />
              <span className={styles.recordingLabel}>Recording…</span>
            </div>
          )}

          {isSpeaking && (
            <div className={styles.speakingIndicator} role="status" aria-label="Speaking">
              <span className={styles.speakingDot} aria-hidden="true" />
              <span className={styles.speakingLabel}>Speaking…</span>
              <button
                type="button"
                className={styles.cancelSpeechButton}
                onClick={onCancelSpeech}
                title="Stop speaking"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
