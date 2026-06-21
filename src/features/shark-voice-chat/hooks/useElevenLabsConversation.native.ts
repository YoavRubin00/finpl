import { useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react-native';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import { fetchConversationToken } from '../services/voiceSessionClient';
import type { ComprehensionOverride } from '../moduleComprehension';

/**
 * Native (iOS/Android) driver for the ElevenLabs Conversational AI session
 * via the official RN SDK (`@elevenlabs/react-native`), which connects over
 * WebRTC/LiveKit. The SDK handles:
 *   - Microphone capture + WebRTC publishing.
 *   - Playback of the agent's audio replies.
 *   - VAD-based turn detection.
 *   - Mic mute control.
 *
 * Callbacks are wired into the shared Zustand store so the UI shows the
 * correct "listening / thinking / speaking" state — same behavior as the
 * web hook in `useElevenLabsConversation.web.ts`.
 *
 * IMPORTANT: callers must mount this hook beneath the `<SharkVoiceProvider>`
 * (which wraps the SDK's `<ConversationProvider>` on native).
 */

function cleanTranscriptText(text: string): string {
  return text
    .replace(/\[[^\]]{1,40}\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Mirror of the web hook's debounce window: real inter-sentence gaps from
// the TTS stream are 600–800ms; 900ms is generous enough to absorb those
// without leaving the avatar stuck in "speaking" once the turn really ends.
const AUDIO_SILENCE_MS = 900;

export function useElevenLabsConversation() {
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAudioAtRef = useRef<number>(0);

  const setStatus = useSharkVoiceStore((s) => s.setStatus);
  const setUserTranscript = useSharkVoiceStore((s) => s.setUserTranscript);
  const setSharkText = useSharkVoiceStore((s) => s.setSharkText);
  const setError = useSharkVoiceStore((s) => s.setError);
  const setMuted = useSharkVoiceStore((s) => s.setMuted);

  const conversation = useConversation({
    onConnect: () => {
      setStatus('listening');
    },
    onDisconnect: () => {
      startedRef.current = false;
      startingRef.current = false;
      setStatus('idle');
    },
    onError: (message: unknown) => {
      const text =
        typeof message === 'string'
          ? message
          : message instanceof Error
            ? message.message
            : 'שגיאה בשירות הקול.';
      setError(text || 'שגיאה בשירות הקול.');
    },
    onMessage: ({ message, source }: { message: string; source: 'user' | 'ai' }) => {
      if (!message) return;
      const cleaned = cleanTranscriptText(message);
      if (!cleaned) return;
      if (source === 'user') {
        setUserTranscript(cleaned);
        setStatus('thinking');
      } else {
        setSharkText(cleaned);
      }
    },
    onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
      if (mode === 'speaking') {
        setStatus('speaking');
        return;
      }
      const elapsed = Date.now() - lastAudioAtRef.current;
      if (elapsed < AUDIO_SILENCE_MS) return;
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      setStatus('listening');
    },
    onAudio: () => {
      lastAudioAtRef.current = Date.now();
      setStatus('speaking');
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => {
        setStatus('listening');
      }, AUDIO_SILENCE_MS);
    },
  });

  const connect = useCallback(async (opts?: ComprehensionOverride) => {
    if (startingRef.current || startedRef.current) return;
    startingRef.current = true;
    setStatus('connecting');
    setError(null);

    let token: string;
    try {
      token = await fetchConversationToken();
    } catch {
      setError('לא הצלחנו להתחיל את השיחה. נסה שוב בעוד רגע.');
      startingRef.current = false;
      return;
    }

    try {
      // Per-module override: inject the comprehension agent prompt/firstMessage/
      // language + dynamic variables so the same agent runs the right check.
      // The `as` cast bridges our `language: string` to the SDK's strict
      // Language union (the value is a validated code like 'he').
      await conversation.startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        ...(opts?.overrides ? { overrides: opts.overrides } : {}),
        ...(opts?.dynamicVariables ? { dynamicVariables: opts.dynamicVariables } : {}),
      } as Parameters<typeof conversation.startSession>[0]);
      startedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'לא ניתן לפתוח חיבור לשירות הקול.';
      setError(message);
      startingRef.current = false;
    }
  }, [conversation, setError, setStatus]);

  const disconnect = useCallback(async () => {
    startingRef.current = false;
    if (!startedRef.current) {
      setStatus('idle');
      return;
    }
    startedRef.current = false;
    try {
      await conversation.endSession();
    } catch {
      // Best-effort cleanup
    }
    setStatus('idle');
  }, [conversation, setStatus]);

  const toggleMute = useCallback(
    (muted: boolean) => {
      try {
        const anyConv = conversation as unknown as { setMicMuted?: (m: boolean) => void };
        if (typeof anyConv.setMicMuted === 'function') {
          anyConv.setMicMuted(muted);
        }
      } catch {
        // Best-effort — fall through to store update so the UI stays in sync.
      }
      setMuted(muted);
    },
    [conversation, setMuted],
  );

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, toggleMute };
}
