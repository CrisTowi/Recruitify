'use client';

import { useRef, useCallback, useState } from 'react';
import styles from './VoiceControls.module.css';

interface Props {
  isVoiceMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  disabled: boolean;
  useCloudStt: boolean;
  onToggleVoiceMode: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelSpeech: () => void;
  onCloudTranscript: (text: string) => void;
}

export default function VoiceControls({
  isVoiceMode,
  isListening,
  isSpeaking,
  isSupported,
  disabled,
  useCloudStt,
  onToggleVoiceMode,
  onStartListening,
  onStopListening,
  onCancelSpeech,
  onCloudTranscript,
}: Props) {
  const [isRecordingCloud, setIsRecordingCloud] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartCloudRecording = useCallback(async () => {
    if (disabled || isRecordingCloud) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const res = await fetch('/api/voice/stt', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json() as { transcript: string };
            onCloudTranscript(data.transcript);
          }
        } catch {
          // Cloud STT failed silently — user can type manually
        }
        setIsRecordingCloud(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingCloud(true);
    } catch {
      // Mic access denied — ignore
    }
  }, [disabled, isRecordingCloud, onCloudTranscript]);

  const handleStopCloudRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  if (!isSupported && !useCloudStt) return null;

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
          {useCloudStt ? (
            <button
              type="button"
              className={`${styles.micButton} ${isRecordingCloud ? styles.micButtonActive : ''}`}
              onClick={isRecordingCloud ? handleStopCloudRecording : handleStartCloudRecording}
              disabled={disabled}
              title={isRecordingCloud ? 'Stop recording' : 'Start recording'}
            >
              <span className={`${styles.micIcon} ${isRecordingCloud ? styles.micPulse : ''}`} aria-hidden="true">
                🎙
              </span>
              <span>{isRecordingCloud ? 'Stop' : 'Record'}</span>
            </button>
          ) : (
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
