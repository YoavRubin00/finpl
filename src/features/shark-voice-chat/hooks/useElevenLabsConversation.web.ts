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
import type { ComprehensionOverride } from '../moduleComprehension';
import { captureEvent } from '../../../lib/posthog';

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

// Frame-accurate "is the shark actually making sound right now" detection.
// We poll the SDK's real OUTPUT audio level (`getOutputVolume()`, 0–1) instead
// of guessing from audio-chunk ARRIVAL timing — chunks are buffered ahead of
// playback, so their timing lags/leads the actual voice. The volume is the
// ground truth, so the talking animation matches exactly when he speaks.
const OUTPUT_POLL_MS = 40; // ~25fps — imperceptible attack latency
// Above this output level = sound is playing. Below the noise floor = silent.
const OUTPUT_SPEAKING_THRESHOLD = 0.025;
// END-OF-TURN quiet, not word-gap quiet (Yoav 2026-07-06, parity with the
// native hook): hold the talking loop through sentence pauses; flip to
// listening only once the reply is genuinely over.
const OUTPUT_RELEASE_MS = 1100;

export function useElevenLabsConversation() {
  const conversationRef = useRef<ConversationHandle | null>(null);
  const startingRef = useRef(false);
  const volumeLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoudAtRef = useRef<number>(0);

  const setStatus = useSharkVoiceStore((s) => s.setStatus);
  const setUserTranscript = useSharkVoiceStore((s) => s.setUserTranscript);
  const setSharkText = useSharkVoiceStore((s) => s.setSharkText);
  const setError = useSharkVoiceStore((s) => s.setError);
  const setMuted = useSharkVoiceStore((s) => s.setMuted);
  const addTurn = useSharkVoiceStore((s) => s.addTurn);

  const disconnect = useCallback(async () => {
    const conv = conversationRef.current;
    conversationRef.current = null;
    startingRef.current = false;
    if (volumeLoopRef.current) {
      clearInterval(volumeLoopRef.current);
      volumeLoopRef.current = null;
    }
    if (conv) {
      try {
        await conv.endSession();
      } catch {
        // Best-effort cleanup
      }
    }
    setStatus('idle');
  }, [setStatus]);

  const connect = useCallback(async (opts?: ComprehensionOverride) => {
    if (startingRef.current || conversationRef.current) return;
    if (Platform.OS !== 'web') {
      setError('שיחת הקול זמינה כרגע רק בגרסת ה-Web. בקרוב גם במובייל.');
      return;
    }
    startingRef.current = true;
    setStatus('connecting');
    setError(null);
    captureEvent('shark_voice_connect_attempt', { platform: Platform.OS, transport: 'websocket' });

    let signedUrl: string;
    try {
      signedUrl = await fetchSignedUrl();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'session-fetch failed';
      captureEvent('shark_voice_error', {
        step: 'session-fetch',
        message: message.slice(0, 300),
        platform: Platform.OS,
      });
      setError('לא הצלחנו להתחיל את השיחה. נסה שוב בעוד רגע.');
      startingRef.current = false;
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Conversation } = require('@elevenlabs/client') as typeof import('@elevenlabs/client');
      // Per-module override (comprehension prompt/firstMessage/language +
      // dynamic variables). The `as` cast bridges our `language: string` to the
      // SDK's strict Language union (the value is a validated code like 'he').
      const conv = await Conversation.startSession({
        signedUrl,
        ...(opts?.overrides ? { overrides: opts.overrides } : {}),
        ...(opts?.dynamicVariables ? { dynamicVariables: opts.dynamicVariables } : {}),
        onConnect: () => {
          captureEvent('shark_voice_connected', { platform: Platform.OS, transport: 'websocket' });
          setStatus('listening');
        },
        onDisconnect: () => {
          setStatus('idle');
        },
        onError: (message) => {
          captureEvent('shark_voice_error', {
            step: 'runtime-error',
            message: String(message ?? '').slice(0, 300),
            platform: Platform.OS,
          });
          setError(message || 'שגיאה בשירות הקול.');
        },
        onMessage: ({ message, role }) => {
          if (!message) return;
          const cleaned = cleanTranscriptText(message);
          if (!cleaned) return;
          if (role === 'user') {
            setUserTranscript(cleaned);
            addTurn('user', cleaned);
            // While the agent generates its reply we're effectively "thinking"
            setStatus('thinking');
          } else if (role === 'agent') {
            setSharkText(cleaned);
            addTurn('shark', cleaned);
          }
        },
        onModeChange: ({ mode }) => {
          // Instant attack: trust the SDK's "speaking" the moment it fires so
          // the mouth opens with zero perceived lag. The RELEASE (when he stops)
          // is owned by the output-volume loop below for frame-accurate sync, so
          // we deliberately IGNORE the SDK's "listening" here (it also fires
          // during mid-sentence breaths, which would cut the animation short).
          if (mode === 'speaking') setStatus('speaking');
        },
      } as Parameters<typeof Conversation.startSession>[0]);
      conversationRef.current = conv;

      // Frame-accurate talking sync: poll the agent's real OUTPUT volume and
      // drive speaking↔listening off actual sound. Attack is instant (volume
      // crosses the threshold); release waits OUTPUT_RELEASE_MS of quiet so
      // word-gaps don't flicker. Only manages speaking/listening — when he's
      // silent we leave the status untouched, so the user-turn "thinking" state
      // set in onMessage is preserved.
      lastLoudAtRef.current = Date.now();
      volumeLoopRef.current = setInterval(() => {
        if (conversationRef.current !== conv) return;
        let vol = 0;
        try {
          vol = conv.getOutputVolume();
        } catch {
          return; // SDK shape changed / not ready — skip this tick
        }
        const status = useSharkVoiceStore.getState().status;
        if (vol > OUTPUT_SPEAKING_THRESHOLD) {
          lastLoudAtRef.current = Date.now();
          if (status !== 'speaking') setStatus('speaking');
        } else if (status === 'speaking' && Date.now() - lastLoudAtRef.current > OUTPUT_RELEASE_MS) {
          setStatus('listening');
        }
      }, OUTPUT_POLL_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'לא ניתן לפתוח חיבור לשירות הקול.';
      captureEvent('shark_voice_error', {
        step: 'start-session',
        message: message.slice(0, 300),
        platform: Platform.OS,
      });
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
