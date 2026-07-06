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
import { installVoicePolyfills } from '../voicePolyfills';

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

// Frame-accurate "is the shark actually making sound right now" detection,
// mirroring the web hook. We poll the SDK's real OUTPUT volume (getOutputVolume,
// 0–1) instead of guessing from audio-chunk ARRIVAL timing. Chunks are buffered
// AHEAD of playback, so onAudio stops firing while the shark is still talking —
// the old 900ms chunk-gap timer then flipped the avatar to "listening" mid-reply
// (Yoav 2026-06-29: "עדיין מתחלף תוך הדיבור"). Volume is the ground truth, so the
// talking loop holds for the WHOLE turn and releases only once he's truly quiet.
const OUTPUT_POLL_MS = 40; // ~25fps — imperceptible attack latency
// Above this output level = sound is playing. Below the noise floor = silent.
const OUTPUT_SPEAKING_THRESHOLD = 0.025;
// END-OF-TURN quiet, not word-gap quiet (Yoav 2026-07-06: the avatar kept
// swapping loops MID-REPLY — every inter-sentence breath crossed the old 160ms
// release). The talking loop must hold for the WHOLE reply and flip to
// listening only once he's genuinely finished, so the release now waits a
// pause no TTS sentence-gap reaches. A barge-in still flips instantly via
// onMessage(user) → 'thinking', so the long release never delays the user.
const OUTPUT_RELEASE_MS = 1100;

export function useElevenLabsConversation() {
  // DOMException (used by livekit-client at module-eval) is absent from Hermes —
  // install the shim before the deferred SDK require below. Idempotent.
  installVoicePolyfills();
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  // Output-volume polling loop (started after startSession) + the last moment
  // real sound was heard. `sawAnyLoudRef` gates the release: we only flip to
  // "listening" once we've CONFIRMED getOutputVolume reports real sound at least
  // once this session. If native volume ever reports 0 throughout (SDK gap), we
  // never auto-release — the avatar holds the talking loop through the turn and
  // only drops to "listening" when the user speaks (onMessage → 'thinking'),
  // which is strictly better than swapping mid-speech.
  const volumeLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoudAtRef = useRef<number>(0);
  const sawAnyLoudRef = useRef(false);

  const setStatus = useSharkVoiceStore((s) => s.setStatus);
  const setUserTranscript = useSharkVoiceStore((s) => s.setUserTranscript);
  const setSharkText = useSharkVoiceStore((s) => s.setSharkText);
  const setError = useSharkVoiceStore((s) => s.setError);
  const setMuted = useSharkVoiceStore((s) => s.setMuted);
  const addTurn = useSharkVoiceStore((s) => s.addTurn);

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
        // Accumulate the full conversation so the comprehension report grades the
        // user's ACTUAL spoken answers on native too. This was web-only — `turns`
        // stayed empty on iOS/Android, so the grader ran on no transcript and the
        // "כולל תשובות לייב" badge / used_transcript never fired on phones.
        addTurn('user', cleaned);
        setStatus('thinking');
      } else {
        setSharkText(cleaned);
        addTurn('shark', cleaned);
      }
    },
    onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
      // Instant attack: trust the SDK's "speaking" the moment it fires so the
      // mouth opens with zero perceived lag. The RELEASE (when he stops) is owned
      // by the output-volume loop below for frame-accurate sync, so we
      // deliberately IGNORE the SDK's "listening" here — it also fires during
      // mid-sentence breaths, which would swap the avatar mid-reply (parity with
      // the web hook; Yoav 2026-06-29).
      if (mode === 'speaking') setStatus('speaking');
    },
    onAudio: () => {
      // Secondary instant-attack + liveness signal. Refreshing lastLoudAtRef here
      // can only DELAY a release, never cause a premature one (the volume loop
      // owns the release), so it's safe even though chunks arrive buffered ahead.
      lastLoudAtRef.current = Date.now();
      setStatus('speaking');
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

      // Frame-accurate talking sync (parity with the web hook): poll the agent's
      // real OUTPUT volume and drive speaking↔listening off actual sound. Attack
      // is instant (volume crosses the threshold, or onAudio/onModeChange above);
      // release waits OUTPUT_RELEASE_MS of quiet so word-gaps don't flicker. Only
      // manages speaking/listening — when he's silent we leave the status
      // untouched, so the user-turn "thinking" set in onMessage is preserved.
      lastLoudAtRef.current = Date.now();
      sawAnyLoudRef.current = false;
      if (volumeLoopRef.current) clearInterval(volumeLoopRef.current);
      volumeLoopRef.current = setInterval(() => {
        if (!startedRef.current) return;
        let vol = 0;
        try {
          const anyConv = conversation as unknown as { getOutputVolume?: () => number };
          vol = typeof anyConv.getOutputVolume === 'function' ? anyConv.getOutputVolume() : 0;
        } catch {
          return; // SDK shape changed / not ready — skip this tick
        }
        const status = useSharkVoiceStore.getState().status;
        if (vol > OUTPUT_SPEAKING_THRESHOLD) {
          lastLoudAtRef.current = Date.now();
          sawAnyLoudRef.current = true;
          if (status !== 'speaking') setStatus('speaking');
        } else if (
          sawAnyLoudRef.current
          && status === 'speaking'
          && Date.now() - lastLoudAtRef.current > OUTPUT_RELEASE_MS
        ) {
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
      if (err instanceof Error) captureException(err, { feature: 'shark-voice', step: 'start-session' });
      setError(message);
      startingRef.current = false;
    }
  }, [conversation, setError, setStatus]);

  const disconnect = useCallback(async () => {
    const wasStarted = startedRef.current;
    startingRef.current = false;
    startedRef.current = false;
    if (volumeLoopRef.current) {
      clearInterval(volumeLoopRef.current);
      volumeLoopRef.current = null;
    }
    if (wasStarted) {
      try {
        await conversation.endSession();
      } catch {
        // Best-effort cleanup
      }
    }
    // Restore the app's DEFAULT playback session — we flipped it to play+record
    // for the call. The global default (app/_layout) is playsInSilentMode:true
    // on the MAIN speaker. Restoring playsInSilentMode:false here was a bug that
    // muted lesson narration on a silent-switched iPhone, and omitting
    // shouldRouteThroughEarpiece left the session routed to the earpiece — so
    // the NEXT module's intro played out the quiet top speaker. Restore the real
    // default so narration stays loud on the main speaker. Best-effort.
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false });
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

  // Disconnect ONLY on real unmount. Keying this on [disconnect] re-ran the
  // effect every time the SDK's `conversation` object changed identity — which
  // happens the moment the call connects / the agent starts speaking — and React
  // runs the PREVIOUS cleanup on each change, calling endSession() and tearing
  // the live call down ~2s after it connected (the "stuck on מתחבר then drops"
  // bug). A ref holds the latest disconnect without making it an effect dep.
  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;
  useEffect(() => {
    return () => {
      void disconnectRef.current();
    };
  }, []);

  return { connect, disconnect, toggleMute };
}
