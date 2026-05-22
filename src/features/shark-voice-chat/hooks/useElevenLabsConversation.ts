import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import { fetchSignedUrl } from '../services/voiceSessionClient';

/**
 * Drives the ElevenLabs Conversational AI WebSocket session.
 *
 * Web implementation:
 *  - getUserMedia for the mic, MediaRecorder for streaming PCM-ish audio
 *    chunks up the WebSocket. JSON frames are interpreted as agent events
 *    (transcripts, responses, audio markers).
 *
 * Native implementation (iOS/Android):
 *  - Wired once ELEVENLABS_AGENT_ID is provisioned and the native SDK is
 *    installed. The current flow connects the WebSocket so transcripts and
 *    text frames work; mic streaming requires the native bridge.
 *
 * Public API:
 *   connect()    — fetches signed URL, opens WebSocket, requests mic on web.
 *   disconnect() — closes WebSocket and releases mic.
 *   toggleMute() — stops/resumes upstream mic frames (no-op on native v1).
 */

interface AgentMessage {
  type: string;
  user_transcript?: string;
  agent_response?: string;
  audio_event?: { audio_base_64?: string };
}

// Browser globals are accessed dynamically because this module also runs in
// React Native, where MediaRecorder/navigator/BlobEvent aren't part of the
// type lib. Using a loose-typed reference keeps the file portable without
// pulling lib.dom into the project tsconfig.
type AnyBrowser = {
  MediaRecorder?: new (stream: unknown, options?: { mimeType?: string }) => {
    start: (timeslice?: number) => void;
    stop: () => void;
    state: string;
    ondataavailable: ((event: { data: { size: number } }) => void) | null;
  };
  navigator?: {
    mediaDevices?: {
      getUserMedia: (constraints: { audio?: boolean }) => Promise<unknown>;
    };
  };
};

function getBrowser(): AnyBrowser {
  return globalThis as unknown as AnyBrowser;
}

export function useElevenLabsConversation() {
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<unknown>(null);
  const mediaRecorderRef = useRef<{ stop: () => void; state: string } | null>(null);

  const setStatus = useSharkVoiceStore((s) => s.setStatus);
  const setUserTranscript = useSharkVoiceStore((s) => s.setUserTranscript);
  const appendSharkText = useSharkVoiceStore((s) => s.appendSharkText);
  const setSharkText = useSharkVoiceStore((s) => s.setSharkText);
  const setError = useSharkVoiceStore((s) => s.setError);

  const handleAgentMessage = useCallback(
    (data: AgentMessage) => {
      switch (data.type) {
        case 'user_transcript':
          if (data.user_transcript) {
            setUserTranscript(data.user_transcript);
            setStatus('thinking');
          }
          break;
        case 'agent_response':
          if (data.agent_response) {
            setSharkText(data.agent_response);
            setStatus('speaking');
          }
          break;
        case 'agent_response_chunk':
          if (data.agent_response) {
            appendSharkText(data.agent_response);
          }
          break;
        case 'audio':
          setStatus('speaking');
          break;
        case 'interruption':
          setStatus('listening');
          break;
        case 'ping':
          wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          break;
      }
    },
    [appendSharkText, setSharkText, setStatus, setUserTranscript],
  );

  const disconnect = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    const stream = micStreamRef.current as { getTracks?: () => Array<{ stop: () => void }> } | null;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop());
    }
    micStreamRef.current = null;

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;

    setStatus('idle');
  }, [setStatus]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    let signedUrl: string;
    try {
      signedUrl = await fetchSignedUrl();
    } catch {
      setError('לא הצלחנו להתחיל את השיחה. נסה שוב בעוד רגע.');
      return;
    }

    try {
      const ws = new WebSocket(signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('listening');
      };

      ws.onmessage = (event) => {
        const raw = (event as { data: unknown }).data;
        if (typeof raw === 'string') {
          try {
            handleAgentMessage(JSON.parse(raw) as AgentMessage);
          } catch {
            // Non-JSON frames are ignored — binary audio is handled by the
            // platform audio adapter (TODO when native mic stream lands).
          }
        }
      };

      ws.onerror = () => {
        setError('שגיאה בחיבור לשירות הקול.');
      };

      ws.onclose = () => {
        setStatus('idle');
      };
    } catch {
      setError('לא ניתן לפתוח חיבור לשירות הקול.');
      return;
    }

    if (Platform.OS === 'web') {
      const browser = getBrowser();
      if (!browser.navigator?.mediaDevices || !browser.MediaRecorder) {
        return;
      }
      try {
        const stream = await browser.navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const recorder = new browser.MediaRecorder(stream, { mimeType: 'audio/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(e.data as unknown as ArrayBuffer);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch {
        setError('נדרשת הרשאת מיקרופון להמשך השיחה.');
        disconnect();
      }
    }
  }, [disconnect, handleAgentMessage, setError, setStatus]);

  const toggleMute = useCallback((muted: boolean) => {
    const stream = micStreamRef.current as
      | { getAudioTracks?: () => Array<{ enabled: boolean }> }
      | null;
    if (stream && typeof stream.getAudioTracks === 'function') {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, toggleMute };
}
