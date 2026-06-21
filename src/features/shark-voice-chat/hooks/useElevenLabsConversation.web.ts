import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
// `@elevenlabs/client` is a web-only SDK — its top-level code reads
// `navigator.userAgent.includes(...)` during module init, which throws on
// React Native (navigator is undefined). Import the type only at compile
// time; load the runtime via require() behind a Platform guard so the
// module never evaluates on Android/iOS.
import type { Conversation as ConversationType } from '@elevenlabs/client';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import { fetchSignedUrl } from '../services/voiceSessionClient';

/**
 * Drives the ElevenLabs Conversational AI session via the official SDK.
 *
 * The SDK handles:
 *  - Microphone capture + PCM16 16kHz encoding (the format the agent expects).
 *  - WebSocket framing of audio chunks (`{ user_audio_chunk: <base64> }`).
 *  - Decoding + playback of the agent's audio replies.
 *  - VAD-based turn detection so the agent waits for you to stop talking.
 *
 * We just wire its callbacks into our local Zustand store so the UI reflects
 * "listening / speaking / thinking" states correctly.
 */

type ConversationHandle = Awaited<ReturnType<typeof ConversationType.startSession>>;

/**
 * Strip Eleven v3 inline emotion tags (e.g. "[happy]", "[warmly]") from the
 * text shown to the user. The TTS engine interprets them as prosody control
 * and renders them inaudibly, but the underlying string still contains them
 * and would otherwise leak into the on-screen transcript.
 */
function cleanTranscriptText(text: string): string {
  return text
    .replace(/\[[^\]]{1,40}\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// After this many ms without an audio chunk arriving we declare the agent
// done speaking and flip back to "listening". TTS streams chunks at
// 20–100ms intervals during active speech, so a real inter-sentence gap
// of 600–800ms is unusual mid-turn. 900ms is generous for natural pauses
// but tight enough that the WebP stops looking "stuck talking" after
// the agent's reply ends.
const AUDIO_SILENCE_MS = 900;

export function useElevenLabsConversation() {
  const conversationRef = useRef<ConversationHandle | null>(null);
  const startingRef = useRef(false);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAudioAtRef = useRef<number>(0);

  const setStatus = useSharkVoiceStore((s) => s.setStatus);
  const setUserTranscript = useSharkVoiceStore((s) => s.setUserTranscript);
  const setSharkText = useSharkVoiceStore((s) => s.setSharkText);
  const setError = useSharkVoiceStore((s) => s.setError);
  const setMuted = useSharkVoiceStore((s) => s.setMuted);

  const disconnect = useCallback(async () => {
    const conv = conversationRef.current;
    conversationRef.current = null;
    startingRef.current = false;
    if (conv) {
      try {
        await conv.endSession();
      } catch {
        // Best-effort cleanup
      }
    }
    setStatus('idle');
  }, [setStatus]);

  const connect = useCallback(async () => {
    if (startingRef.current || conversationRef.current) return;
    if (Platform.OS !== 'web') {
      setError('שיחת הקול זמינה כרגע רק בגרסת ה-Web. בקרוב גם במובייל.');
      return;
    }
    startingRef.current = true;
    setStatus('connecting');
    setError(null);

    let signedUrl: string;
    try {
      signedUrl = await fetchSignedUrl();
    } catch {
      setError('לא הצלחנו להתחיל את השיחה. נסה שוב בעוד רגע.');
      startingRef.current = false;
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Conversation } = require('@elevenlabs/client') as typeof import('@elevenlabs/client');
      const conv = await Conversation.startSession({
        signedUrl,
        onConnect: () => {
          setStatus('listening');
        },
        onDisconnect: () => {
          setStatus('idle');
        },
        onError: (message) => {
          setError(message || 'שגיאה בשירות הקול.');
        },
        onMessage: ({ message, role }) => {
          if (!message) return;
          const cleaned = cleanTranscriptText(message);
          if (!cleaned) return;
          if (role === 'user') {
            setUserTranscript(cleaned);
            // While the agent generates its reply we're effectively "thinking"
            setStatus('thinking');
          } else if (role === 'agent') {
            setSharkText(cleaned);
          }
        },
        onModeChange: ({ mode }) => {
          if (mode === 'speaking') {
            setStatus('speaking');
            return;
          }
          // SDK fires "listening" during brief mid-turn audio gaps (silence
          // between sentences, breaths). Ignore those — only flip back when
          // the silence timer below has confirmed sustained quiet.
          const now = Date.now();
          const elapsed = now - lastAudioAtRef.current;
          if (elapsed < AUDIO_SILENCE_MS) return;
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          setStatus('listening');
        },
        onAudio: () => {
          // Every audio chunk = "still talking". Keep us in speaking state and
          // reset the silence timer. Only when no chunks arrive for the full
          // AUDIO_SILENCE_MS window do we acknowledge the turn is over.
          lastAudioAtRef.current = Date.now();
          setStatus('speaking');
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = setTimeout(() => {
            setStatus('listening');
          }, AUDIO_SILENCE_MS);
        },
      });
      conversationRef.current = conv;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'לא ניתן לפתוח חיבור לשירות הקול.';
      setError(message);
      startingRef.current = false;
    }
  }, [setError, setSharkText, setStatus, setUserTranscript]);

  const toggleMute = useCallback(
    (muted: boolean) => {
      const conv = conversationRef.current;
      // The SDK exposes setMicMuted on the underlying input controller — guard
      // for shape changes between SDK versions.
      const anyConv = conv as unknown as { setMicMuted?: (m: boolean) => void };
      if (anyConv && typeof anyConv.setMicMuted === 'function') {
        anyConv.setMicMuted(muted);
      }
      setMuted(muted);
    },
    [setMuted],
  );

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, toggleMute };
}
