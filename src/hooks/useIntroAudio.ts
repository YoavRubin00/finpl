import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
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

// Yoav 2026-06-12: the mod-0-1 intro narration is BUNDLED into the app. It is
// the very first audio a new user ever hears, and Vercel Blob's intermittent
// per-client http_403 episodes (see useModulePrefetch) were killing exactly
// that first impression ("במפגש הראשון של המשתמש עם האפליקציה הוא לא יתקל
// במצב שהסאונד לא עובד"). Keyed by the EXACT remote URL chapter0Data ships,
// so the data layer stays unchanged — when an intro's audioUri matches, we
// play the bundled asset directly: instant, offline, immune to the CDN.
// Everything else keeps the prefetch+rebuild cloud path.
// ⚠️ FILENAME TRAP (caught in verification 2026-06-12): the 2026-06-04 module
// split left LEGACY blob filenames — mod-0-1's intro audio is the file named
// "mod-0-2-short-…", and "mod-0-1-v2" belongs to mod-0-2. The map is keyed by
// what chapter0Data ACTUALLY ships per module (verified line-by-line against
// the data; NEVER infer from the blob filename). Local assets are named by
// ROLE (mod-0-2.mp3 = mod-0-2's intro) and every file is a bit-identical
// (md5-verified) copy of its remote counterpart.
//
// ALL of chapter 0 (~950KB total) is bundled so the entire ONBOARDING is
// immune to Vercel Blob's per-client 403 episodes — a brand-new user can
// complete every chapter-0 intro with zero network (Yoav 2026-06-12).
// Chapters 1-5 keep the prefetch+rebuild cloud path.
/* eslint-disable @typescript-eslint/no-require-imports */
const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com';
const BUNDLED_INTRO_AUDIO: Record<string, number> = {
  // mod-0-1 — legacy filename "mod-0-2-short"
  [`${BLOB}/audio/shorts/mod-0-2-short-H4gu5Wa32VkKfcIiXNulOPZ1ux4QjP.mp3`]:
    require('../../assets/intro-audio/mod-0-1.mp3') as number,
  // mod-0-1b
  [`${BLOB}/audio/intros/mod-0-1b-v1-f5HBLPXOnpzcwzUtk8dIdovOAHK6ZW.mp3`]:
    require('../../assets/intro-audio/mod-0-1b.mp3') as number,
  // mod-0-2 — legacy filename "mod-0-1-v2"
  [`${BLOB}/audio/intros/mod-0-1-v2.mp3`]:
    require('../../assets/intro-audio/mod-0-2.mp3') as number,
  // mod-0-3
  [`${BLOB}/audio/intros/mod-0-3-v2.mp3`]:
    require('../../assets/intro-audio/mod-0-3.mp3') as number,
  // mod-0-4
  [`${BLOB}/audio/shorts/mod-0-4-short-ZPgBLIq13yqwzvuYinxYQOGp8fJohf.mp3`]:
    require('../../assets/intro-audio/mod-0-4.mp3') as number,
  // mod-0-5
  [`${BLOB}/audio/intros/mod-0-5-v2.mp3`]:
    require('../../assets/intro-audio/mod-0-5.mp3') as number,
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** True when the given intro-audio URL ships inside the app binary — callers
 *  (e.g. the next-module warm-up prefetch) can skip downloading those. */
export function isBundledIntroAudio(uri: string | undefined): boolean {
  return !!uri && BUNDLED_INTRO_AUDIO[uri] !== undefined;
}

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
  // When true (e.g. an energy-intro modal is covering the intro in mod-0-1b),
  // HOLD the voice — don't build/play the player until it flips false. Overrides
  // the bundled shortcut below (Yoav 2026-06-25). The effect re-runs when changed.
  paused?: boolean,
): IntroAudioState {
  const [state, setState] = useState<IntroAudioState>(audioUri ? 'loading' : 'idle');
  const playerRef = useRef<AudioPlayer | null>(null);
  const retriedRef = useRef(false);

  // Bundled (chapter-0) intro audio has nothing to prefetch, so `audioReady` is
  // irrelevant to it. Freeze the effect's "ready" input to a constant `true` for
  // bundled clips: otherwise a late audioReady flip (false→true, ~0.5s after the
  // bundled player already started) re-runs the effect, tears the playing player
  // down and rebuilds it → the voice restarts from 0 (Yoav 2026-06-23). Non-
  // bundled keeps the real audioReady so the prefetch→cached-path swap still works.
  const effectiveReady = audioUri && BUNDLED_INTRO_AUDIO[audioUri] !== undefined ? true : audioReady;

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
    const bundled = BUNDLED_INTRO_AUDIO[audioUri];

    const buildPlayer = () => {
      if (cancelled) return;
      if (sub) { try { sub.remove(); } catch { /* ignore */ } sub = null; }
      if (player) {
        try { player.pause(); } catch { /* ignore */ }
        try { player.remove(); } catch { /* ignore */ }
      }
      // Bundled asset (mod-0-1) → play straight from the app binary; no
      // network, no cache lookup. Otherwise prefer the prefetched local copy.
      player = bundled !== undefined
        ? createAudioPlayer(bundled)
        : createAudioPlayer({ uri: getCachedAudioPath(audioUri) });
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
      // iOS earpiece guard (Yoav 2026-06-26): a prior shark voice call leaves
      // the shared audio session in .playAndRecord, which iOS routes to the
      // quiet EARPIECE — so the intro/module narration came out the small top
      // speaker instead of the loud bottom one. Re-assert .playback on the MAIN
      // speaker right before narrating (allowsRecording:false flips the category
      // back). Best-effort; never blocks playback.
      if (Platform.OS === 'ios') {
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false }).catch(() => { /* non-fatal */ });
      }
      // Kick off the robust, RETRYING download (RETRY_DELAYS_MS handles
      // Vercel Blob's intermittent on-device http_403). Idempotent — no-op if
      // already cached. Skipped for bundled assets — nothing to download.
      if (bundled === undefined) prefetchModuleAudio(audioUri);
      retriedRef.current = false;
      buildPlayer();

      // Visual hint after 500ms — gives the user proof of life before any retry
      // or failure UI surfaces.
      slowTimer = setTimeout(() => {
        if (!hasStartedPlaying) setState('slow');
      }, 500);

      // Retries REBUILD the player from the (by-now-likely-cached) local path
      // instead of just re-calling play() on a dead remote stream — useless
      // against a 403'd source. By 1.2s / 3.5s the retrying download has
      // usually landed the file locally.
      // ⚠️ BUNDLED assets are EXEMPT (Yoav 2026-06-12 bug): buildPlayer() is
      // destructive (pause+remove+recreate), and `hasStartedPlaying` only
      // flips once a playbackStatusUpdate tick reports currentTime>0.05 — with
      // expo-audio's default 500ms updateInterval, that first qualifying tick
      // can slip past 1200ms on a cold launch. For a bundled local clip the
      // rebuild can NEVER help (same fully-loaded source) and would just CUT
      // the shark's voice mid-sentence and restart it from 0. Remote keeps the
      // rebuild (it's the 403 recovery).
      retry1 = setTimeout(() => {
        if (!hasStartedPlaying && bundled === undefined) {
          buildPlayer();
          captureEvent('intro_audio_delayed', { retry_stage: 1, platform: Platform.OS });
        }
      }, 1200);
      retry2 = setTimeout(() => {
        if (!hasStartedPlaying && bundled === undefined) {
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

    // Held by the caller (e.g. the energy-intro modal in mod-0-1b) — DON'T start
    // the voice yet. Overrides the bundled shortcut. The effect re-runs when
    // `paused` flips false (after cleanup tears down any prior player) → start().
    if (paused) return;

    if (effectiveReady === false && bundled === undefined) {
      // Prefetch still in flight. Defer createAudioPlayer briefly so the
      // local cached file (which getCachedAudioPath will return once the
      // download completes) can be used. If the prefetch resolves before
      // the timeout, the parent re-renders with audioReady=true → this
      // effect re-runs from its cleanup, cancelling the timer and starting
      // immediately with the now-cached path. Bundled assets skip the wait —
      // there is nothing to prefetch.
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
  }, [audioUri, effectiveReady, paused]);

  return state;
}
