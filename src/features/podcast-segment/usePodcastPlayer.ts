import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
  togglePlayPause: () => void;
  replay: () => void;
  /** Seek forwards by N seconds (clamped at duration). Auto-resumes if paused. */
  seekForward: (seconds: number) => void;
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
  const playerRef = useRef<AudioPlayer | null>(null);
  const hasStartedRef = useRef(false);
  const finishedFiredRef = useRef(false);
  const retriedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

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
        setPhase('finished');
        setProgress(1);
        if (!finishedFiredRef.current) {
          finishedFiredRef.current = true;
          onFinishedRef.current?.();
        }
        return;
      }
      if (status.playing) {
        if (t < 0.05) return;
        hasStartedRef.current = true;
        setPhase('playing');
        return;
      }
      if (hasStartedRef.current) {
        if (d > 0 && t >= d - 0.25) {
          setPhase('finished');
          setProgress(1);
          if (!finishedFiredRef.current) {
            finishedFiredRef.current = true;
            onFinishedRef.current?.();
          }
        } else {
          setPhase('paused');
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

    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      sub.remove();
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
      // Clamp just before the end so we don't accidentally trigger didJustFinish
      const maxTarget = dur > 0 ? Math.max(0, dur - 0.1) : current + seconds;
      const target = Math.min(maxTarget, current + seconds);
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

  return { phase, progress, togglePlayPause, replay, seekForward };
}
