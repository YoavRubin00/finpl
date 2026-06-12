import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { captureEvent } from '../lib/posthog';
import { getCachedAudioPath, prefetchModuleAudio } from './useModulePrefetch';

export type IntroAudioState =
  | 'idle'
  | 'loading'
  | 'slow'
  | 'playing'
  | 'paused'
  | 'finished'
  | 'failed';

/** Max time to defer createAudioPlayer waiting for the parallel prefetch
 *  to finish. Past this we fall through to the original behavior (cold
 *  remote fetch + the existing two-stage retry). 800ms was chosen against
 *  PostHog data (2026-06-07): the prefetch typically completes well under
 *  it on cellular, while users still don't perceive the gap because the
 *  intro card's mascot + text are already on screen. Beats waiting for
 *  retry_stage:2 (1000ms) and then maybe failing at 3000ms. */
const PREFETCH_WAIT_MAX_MS = 800;

/**
 * Manages a single intro audio clip with tight sync to the Finn mascot.
 *
 * Returned state maps to visual behavior:
 *   - 'loading'  → before first playback frame (0-500ms)
 *   - 'slow'     → still buffering after 500ms; intro components show a small
 *                  "טוען אודיו..." hint so the screen doesn't feel frozen
 *   - 'playing'  → audio actively playing, talking webp animates
 *   - 'paused'   → audio paused mid-clip (buffering / phone interruption), talking webp freezes
 *   - 'finished' → audio completed, switch to standard (mouth-closed) webp
 *   - 'failed'   → 3s without playback; intro components show "המשך בלי אודיו →"
 *
 * Reliability retries: iOS cold-launch sometimes drops the first play() before
 * the audio session is ready. We retry quickly at 400ms and again at 1000ms.
 *
 * Prefetch coordination (2026-06-07): callers can pass `audioReady` from
 * `useModulePrefetch`. When `audioReady === false`, the hook defers
 * createAudioPlayer for up to PREFETCH_WAIT_MAX_MS — once the prefetch
 * completes (audioReady flips true), the effect re-runs and the player
 * gets the local cached path instead of cold-fetching from Vercel Blob.
 * PostHog showed 93% of lessons firing `intro_audio_delayed` because the
 * player started before the prefetched MP3 landed in cache.
 */
export function useIntroAudio(
  audioUri: string | undefined,
  audioReady?: boolean,
): IntroAudioState {
  const [state, setState] = useState<IntroAudioState>(audioUri ? 'loading' : 'idle');
  const playerRef = useRef<AudioPlayer | null>(null);
  const retriedRef = useRef(false);

  useEffect(() => {
    if (!audioUri) {
      setState('idle');
      return;
    }

    setState('loading');
    retriedRef.current = false;

    let cancelled = false;
    let player: AudioPlayer | null = null;
    let sub: ReturnType<AudioPlayer['addListener']> | null = null;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let retry1: ReturnType<typeof setTimeout> | undefined;
    let retry2: ReturnType<typeof setTimeout> | undefined;
    let failTimer: ReturnType<typeof setTimeout> | undefined;
    let prefetchWaitTimer: ReturnType<typeof setTimeout> | undefined;
    let hasStartedPlaying = false;

    // Build (or REBUILD) the player from the BEST currently-available source:
    // the locally-cached file if the robust prefetch has landed it, otherwise
    // the remote URL as a best-effort. Rebuilding on retry is the core fix —
    // Vercel Blob intermittently 403s the remote STREAM on-device (documented
    // in useModulePrefetch; same URLs serve 200 to curl), and a streamed 403
    // fails hard with no recovery. Once the retrying download caches the file,
    // the next rebuild plays it from disk → cloud loading "just works".
    const buildPlayer = () => {
      if (cancelled) return;
      if (sub) { try { sub.remove(); } catch { /* ignore */ } sub = null; }
      if (player) {
        try { player.pause(); } catch { /* ignore */ }
        try { player.remove(); } catch { /* ignore */ }
      }
      const resolvedUri = getCachedAudioPath(audioUri);
      player = createAudioPlayer({ uri: resolvedUri });
      playerRef.current = player;
      player.play();

      sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setState('finished');
          return;
        }
        if (status.playing) {
          // Wait for actual speech onset — some clips have a brief silent
          // lead-in; advancing to 'playing' too early makes the webp animate
          // before the voice is audible.
          if ((status.currentTime ?? 0) < 0.05) return;
          if (!hasStartedPlaying) {
            try { captureEvent('lesson_intro_audio_played', { audio_url: audioUri, platform: Platform.OS }); } catch { /* non-fatal */ }
          }
          hasStartedPlaying = true;
          setState('playing');
          return;
        }
        if (hasStartedPlaying) {
          // Stopped after having played. If we're near duration it's finished,
          // otherwise it's paused (buffering / brief gap / system interruption).
          const d = status.duration ?? 0;
          const t = status.currentTime ?? 0;
          if (d > 0 && t >= d - 0.25) {
            setState('finished');
          } else {
            setState('paused');
          }
        }
      });
    };

    const start = () => {
      if (cancelled) return;
      // Always kick off the robust, RETRYING download (RETRY_DELAYS_MS handles
      // Vercel Blob's intermittent on-device http_403). Idempotent — no-op if
      // already cached. This is what makes "cloud loading with prefetch"
      // actually reliable instead of a fragile one-shot remote stream.
      prefetchModuleAudio(audioUri);
      retriedRef.current = false;
      buildPlayer();

      // Visual hint after 500ms — gives the user proof of life before any retry
      // or failure UI surfaces.
      slowTimer = setTimeout(() => {
        if (!hasStartedPlaying) setState('slow');
      }, 500);

      // Retries now REBUILD the player from the (by-now-likely-cached) local
      // path instead of just re-calling play() on a dead remote stream — that
      // was useless against a 403'd source. By 1.2s / 3.5s the retrying
      // download has usually landed the file locally.
      retry1 = setTimeout(() => {
        if (!hasStartedPlaying) {
          buildPlayer();
          captureEvent('intro_audio_delayed', { retry_stage: 1, platform: Platform.OS });
        }
      }, 1200);
      retry2 = setTimeout(() => {
        if (!hasStartedPlaying) {
          buildPlayer();
          captureEvent('intro_audio_delayed', { retry_stage: 2, platform: Platform.OS });
        }
      }, 3500);

      // After 6s (was 3s) with no playback, surface a "continue without audio"
      // fallback. Extended so the download's retry backoff (up to ~9s) has a
      // fair chance to land the file before we give up.
      failTimer = setTimeout(() => {
        if (!hasStartedPlaying) {
          setState('failed');
          captureEvent('intro_audio_failed', { platform: Platform.OS });
        }
      }, 6000);
    };

    if (audioReady === false) {
      // Prefetch still in flight. Defer createAudioPlayer briefly so the
      // local cached file (which getCachedAudioPath will return once the
      // download completes) can be used. If the prefetch resolves before
      // the timeout, the parent re-renders with audioReady=true → this
      // effect re-runs from its cleanup, cancelling the timer and starting
      // immediately with the now-cached path.
      prefetchWaitTimer = setTimeout(start, PREFETCH_WAIT_MAX_MS);
    } else {
      start();
    }

    return () => {
      cancelled = true;
      if (prefetchWaitTimer) clearTimeout(prefetchWaitTimer);
      if (slowTimer) clearTimeout(slowTimer);
      if (retry1) clearTimeout(retry1);
      if (retry2) clearTimeout(retry2);
      if (failTimer) clearTimeout(failTimer);
      if (sub) sub.remove();
      if (player) {
        try { player.pause(); } catch { /* ignore */ }
        try { player.remove(); } catch { /* ignore */ }
      }
      playerRef.current = null;
    };
  }, [audioUri, audioReady]);

  return state;
}
