import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
// Type-only import: `@elevenlabs/react-native` pulls the native LiveKit/WebRTC
// SDK, whose module factory throws at EVALUATION in the production Hermes
// bundle. A static `import` here poisons the call-screen module graph so
// `require('ModuleComprehensionCallScreen')` resolves to `undefined` (the prod
// crash). Load the hook via require() inside the body — Metro caches the module
// after first eval, and this hook only mounts behind the LIVE_VOICE_AVAILABLE +
// Pro gates, so the SDK still evaluates only when a call actually starts. Same
// idiom as useElevenLabsConversation.web.ts.
import type { useConversation as UseConversationType } from '@elevenlabs/react-native';
import { setAudioModeAsync } from 'expo-audio';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import { fetchConversationToken } from '../services/voiceSessionClient';
import type { ComprehensionOverride } from '../moduleComprehension';
import { captureEvent } from '../../../lib/posthog';
import { captureException } from '../../../lib/sentry';

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

  // Runtime-load the SDK hook (see the type-only import note above). Cheap cache
  // hit after first eval; keeps the native SDK out of the module-eval graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useConversation } = require('@elevenlabs/react-native') as {
    useConversation: typeof UseConversationType;
  };

  const conversation = useConversation({
    onConnect: () => {
      captureEvent('shark_voice_connected', { platform: Platform.OS, transport: 'webrtc' });
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
      captureEvent('shark_voice_error', {
        step: 'runtime-error',
        message: String(text).slice(0, 300),
        platform: Platform.OS,
      });
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
    captureEvent('shark_voice_connect_attempt', { platform: Platform.OS, transport: 'webrtc' });

    let token: string;
    try {
      token = await fetchConversationToken();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'token-fetch failed';
      captureEvent('shark_voice_error', {
        step: 'token-fetch',
        message: message.slice(0, 300),
        platform: Platform.OS,
      });
      setError('לא הצלחנו להתחיל את השיחה. נסה שוב בעוד רגע.');
      startingRef.current = false;
      return;
    }

    // iOS: the live SDK (WebRTC/LiveKit) needs the AVAudioSession in
    // play-and-record. expo-audio's default leaves it in `.playback` (lesson
    // narration), so WebRTC's record activation throws "Session activation
    // failed" (ExpoModulesCore) and the call dies before it opens. Flip to
    // play+record BEFORE startSession. Best-effort — never block the connect.
    // shouldRouteThroughEarpiece:false is REQUIRED (Yoav 2026-06-26): on iOS
    // `allowsRecording:true` switches the category to `.playAndRecord`, which
    // routes to the EARPIECE by default — the user heard the shark from the
    // phone-call speaker, not the loud speaker. Forcing it false adds
    // `.defaultToSpeaker` so the call plays out the main speaker (hands-free).
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true, shouldRouteThroughEarpiece: false });
    } catch {
      /* non-fatal — fall through and let the SDK try */
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
      // Re-assert speaker routing AFTER startSession: LiveKit reconfigures the
      // AVAudioSession when the connection comes up and can revert it to the
      // earpiece. Re-applying here wins that race (Yoav 2026-06-26). Best-effort.
      try {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true, shouldRouteThroughEarpiece: false });
      } catch { /* non-fatal */ }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'לא ניתן לפתוח חיבור לשירות הקול.';
      captureEvent('shark_voice_error', {
        step: 'start-session',
        message: message.slice(0, 300),
        platform: Platform.OS,
      });
      if (err instanceof Error) captureException(err, { feature: 'shark-voice', step: 'start-session' });
      setError(message);
      startingRef.current = false;
    }
  }, [conversation, setError, setStatus]);

  const disconnect = useCallback(async () => {
    const wasStarted = startedRef.current;
    startingRef.current = false;
    startedRef.current = false;
    if (wasStarted) {
      try {
        await conversation.endSession();
      } catch {
        // Best-effort cleanup
      }
    }
    // Restore the default playback-only session — we flipped it to play+record
    // for the call, and lesson narration expects the original mode back.
    // Best-effort + idempotent.
    try {
      await setAudioModeAsync({ playsInSilentMode: false, allowsRecording: false });
    } catch {
      /* non-fatal */
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
