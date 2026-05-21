import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { captureEvent } from '../../lib/posthog';

export type PodcastPlayerPhase =
  | 'loading'
  | 'playing'
  | 'paused'
  | 'finished';

export interface PodcastPlayerState {
  phase: PodcastPlayerPhase;
  /** 0..1 fraction of audio played */
  progress: number;
  /** Current playback rate (1.0 = normal). */
  rate: number;
  togglePlayPause: () => void;
  replay: () => void;
  /** Seek forwards by N seconds (clamped at duration). Auto-resumes if paused. */
  seekForward: (seconds: number) => void;
  /** Set playback speed (e.g. 1.0, 1.2, 1.5). Survives play/pause cycles. */
  setRate: (rate: number) => void;
}

/**
 * Owns the audio lifecycle for a single 20-second podcast clip.
 *
 * Extends the useIntroAudio pattern with:
 *   - exposed progress (0..1) for UI bars
 *   - explicit togglePlayPause + replay
 *   - onFinished callback (fires once)
 */
export function usePodcastPlayer(
  audioUri: string,
  onFinished?: () => void,
): PodcastPlayerState {
  const [phase, setPhase] = useState<PodcastPlayerPhase>('loading');
  const [progress, setProgress] = useState(0);
  const [rate, setRateState] = useState(1);
  const playerRef = useRef<AudioPlayer | null>(null);
  // Keep the latest selected rate so we can re-apply it after replay() recreates
  // the playback session (some Android devices reset to 1.0 on seekTo(0) + play).
  const rateRef = useRef(1);
  const hasStartedRef = useRef(false);
  const finishedFiredRef = useRef(false);
  const retriedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  /** Debounce timer for paused-state transition.
   *  We don't want to flicker to 'paused' for sub-second jitter in `playing` (micro
   *  pauses between sentences, brief buffering). Only commit if `playing=false`
   *  stays stable for 400ms. */
  const pausedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    setPhase('loading');
    setProgress(0);
    hasStartedRef.current = false;
    finishedFiredRef.current = false;
    retriedRef.current = false;

    const player = createAudioPlayer({ uri: audioUri });
    playerRef.current = player;
    // Re-apply the user-selected rate to the freshly created player. If the
    // listener swaps audioUri (rare, but happens if a re-render restarts the
    // effect), we keep whatever 1.0/1.2/1.5 the user had selected previously.
    if (rateRef.current !== 1) {
      try { player.setPlaybackRate(rateRef.current); } catch { /* ignore */ }
    }
    player.play();

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      const d = status.duration ?? 0;
      const t = status.currentTime ?? 0;
      currentTimeRef.current = t;
      if (d > 0) durationRef.current = d;
      if (d > 0) {
        setProgress(Math.min(1, Math.max(0, t / d)));
      }

      if (status.didJustFinish) {
        if (pausedDebounceRef.current) {
          clearTimeout(pausedDebounceRef.current);
          pausedDebounceRef.current = null;
        }
        setPhase('finished');
        setProgress(1);
        if (!finishedFiredRef.current) {
          finishedFiredRef.current = true;
          onFinishedRef.current?.();
        }
        return;
      }
      if (status.playing) {
        // Cancel any pending pause — we got a 'playing' update before the debounce fired
        if (pausedDebounceRef.current) {
          clearTimeout(pausedDebounceRef.current);
          pausedDebounceRef.current = null;
        }
        if (t < 0.05) return;
        hasStartedRef.current = true;
        setPhase('playing');
        return;
      }
      if (hasStartedRef.current) {
        if (d > 0 && t >= d - 0.25) {
          if (pausedDebounceRef.current) {
            clearTimeout(pausedDebounceRef.current);
            pausedDebounceRef.current = null;
          }
          setPhase('finished');
          setProgress(1);
          if (!finishedFiredRef.current) {
            finishedFiredRef.current = true;
            onFinishedRef.current?.();
          }
        } else if (!pausedDebounceRef.current) {
          // Debounce: only set phase='paused' if `playing=false` is stable for 400ms.
          // Prevents flicker on micro-pauses inside the audio (between sentences) or
          // transient buffer underruns that resolve quickly.
          pausedDebounceRef.current = setTimeout(() => {
            setPhase('paused');
            pausedDebounceRef.current = null;
          }, 400);
        }
      }
    });

    const retry1 = setTimeout(() => {
      if (!hasStartedRef.current && !retriedRef.current) {
        retriedRef.current = true;
        try { player.play(); } catch { /* ignore */ }
        captureEvent('podcast_audio_delayed', {
          retry_stage: 1,
          platform: Platform.OS,
        });
      }
    }, 400);
    const retry2 = setTimeout(() => {
      if (!hasStartedRef.current) {
        try { player.play(); } catch { /* ignore */ }
        captureEvent('podcast_audio_delayed', {
          retry_stage: 2,
          platform: Platform.OS,
        });
      }
    }, 1000);

    // AppState handler — pause the audio when the user backgrounds the app
    // (or opens another app on top). Without this, expo-audio keeps the mp3
    // playing in the background even though the user has clearly left the
    // podcast UI, which is jarring and drains battery. We don't auto-resume
    // when the user comes back; they tap play themselves so they don't miss
    // story content while glancing away.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        try { player.pause(); } catch { /* ignore */ }
      }
    });

    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      if (pausedDebounceRef.current) {
        clearTimeout(pausedDebounceRef.current);
        pausedDebounceRef.current = null;
      }
      appStateSub.remove();
      sub.remove();
      // Hard-stop on unmount: pause first to halt audio immediately, then
      // remove the player so its native resources are freed. Both calls are
      // wrapped in try/catch because either one can throw if the player is
      // already in a terminal state.
      try { player.pause(); } catch { /* ignore */ }
      try { player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [audioUri]);

  const togglePlayPause = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (phase === 'playing') {
      try { p.pause(); } catch { /* ignore */ }
    } else if (phase === 'paused') {
      try { p.play(); } catch { /* ignore */ }
    }
  }, [phase]);

  const replay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.seekTo(0);
      // Some Android builds reset playbackRate to 1.0 after seekTo(0); re-apply
      // the user's selection so "replay" doesn't silently downshift to 1x.
      if (rateRef.current !== 1) {
        try { p.setPlaybackRate(rateRef.current); } catch { /* ignore */ }
      }
      p.play();
      finishedFiredRef.current = false;
      setPhase('loading');
      setProgress(0);
    } catch { /* ignore */ }
  }, []);

  const seekForward = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      // Use the tracked currentTime ref (status listener) — `p.currentTime` getter
      // is not reliably exposed on all expo-audio versions and may return 0/undefined.
      const current = currentTimeRef.current;
      const dur = durationRef.current;
      // Clamp just before the end so we don't accidentally trigger didJustFinish.
      // Negative `seconds` is allowed (seek backward) — Math.max(0, …) keeps us
      // from rewinding past the start of the file.
      const maxTarget = dur > 0 ? Math.max(0, dur - 0.1) : current + seconds;
      const target = Math.max(0, Math.min(maxTarget, current + seconds));
      p.seekTo(target);
      if (dur > 0) {
        setProgress(Math.min(1, Math.max(0, target / dur)));
      }
      // If paused, resume from the new position
      if (phase === 'paused') {
        setPhase('playing');
        p.play();
      }
    } catch { /* ignore */ }
  }, [phase]);

  const setRate = useCallback((nextRate: number) => {
    // Clamp to the range expo-audio accepts on every platform (0.5–2.0 per
    // docs); our UI only exposes 1.0/1.2/1.5 but defend against bad input.
    const clamped = Math.max(0.5, Math.min(2, nextRate));
    rateRef.current = clamped;
    setRateState(clamped);
    const p = playerRef.current;
    if (!p) return;
    try { p.setPlaybackRate(clamped); } catch { /* ignore */ }
  }, []);

  return { phase, progress, rate, togglePlayPause, replay, seekForward, setRate };
}
