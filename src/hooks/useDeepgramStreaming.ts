'use client';

import { useCallback, useRef, useState } from 'react';

export interface UseDeepgramStreamingReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface DeepgramResultMessage {
  type: string;
  is_final: boolean;
  channel: {
    alternatives: Array<{ transcript: string }>;
  };
}

export function useDeepgramStreaming(): UseDeepgramStreamingReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const stopListening = useCallback(() => {
    isListeningRef.current = false;

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    setInterimTranscript('');
    setIsListening(false);
  }, []);

  const startListening = useCallback((): void => {
    if (isListeningRef.current) return;

    void (async () => {
      try {
        setError(null);

        const res = await fetch('/api/voice/stt/token');
        if (!res.ok) throw new Error('Failed to get STT token');
        const { apiKey } = await res.json() as { apiKey: string };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&interim_results=true&endpointing=300&punctuate=true';
        const ws = new WebSocket(wsUrl, ['token', apiKey]);
        wsRef.current = ws;

        ws.onopen = () => {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(event.data);
            }
          };

          recorder.start(250);
          isListeningRef.current = true;
          setIsListening(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as DeepgramResultMessage;
            if (data.type !== 'Results') return;

            const text = data.channel?.alternatives[0]?.transcript ?? '';
            if (!text) return;

            if (data.is_final) {
              setTranscript((prev) => (prev ? `${prev} ${text}` : text));
              setInterimTranscript('');
            } else {
              setInterimTranscript(text);
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          setError('Connection to Deepgram failed');
          stopListening();
        };

        ws.onclose = () => {
          if (isListeningRef.current) {
            stopListening();
          }
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start recording';
        setError(message);
        stopListening();
      }
    })();
  }, [stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
