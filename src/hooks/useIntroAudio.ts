import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { captureEvent } from '../lib/posthog';
import { getCachedAudioPath } from './useModulePrefetch';

export type IntroAudioState =
  | 'idle'
  | 'loading'
  | 'slow'
  | 'playing'
  | 'paused'
  | 'finished'
  | 'failed';

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
 */
export function useIntroAudio(audioUri: string | undefined): IntroAudioState {
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
    // Prefer the prefetched local copy when available — eliminates the cold
    // download that was the source of intro_audio_delayed retry_stage:2.
    const resolvedUri = getCachedAudioPath(audioUri);
    const player = createAudioPlayer({ uri: resolvedUri });
    playerRef.current = player;
    player.play();

    let hasStartedPlaying = false;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
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

    // Visual hint after 500ms — gives the user proof of life before any retry
    // or failure UI surfaces.
    const slowTimer = setTimeout(() => {
      if (!hasStartedPlaying) setState('slow');
    }, 500);

    // Two-stage retry. 400ms catches the common iOS cold-launch race; 1000ms
    // is a slower-network safety net before users perceive a silent intro.
    const retry1 = setTimeout(() => {
      if (!hasStartedPlaying && !retriedRef.current) {
        retriedRef.current = true;
        try { player.play(); } catch { /* ignore */ }
        captureEvent('intro_audio_delayed', {
          retry_stage: 1,
          platform: Platform.OS,
        });
      }
    }, 400);
    const retry2 = setTimeout(() => {
      if (!hasStartedPlaying) {
        try { player.play(); } catch { /* ignore */ }
        captureEvent('intro_audio_delayed', {
          retry_stage: 2,
          platform: Platform.OS,
        });
      }
    }, 1000);

    // After 3s with no playback start, surface a "continue without audio"
    // fallback in the UI. Without this the user is stranded on the intro
    // card watching Finn's mouth move silently.
    const failTimer = setTimeout(() => {
      if (!hasStartedPlaying) {
        setState('failed');
        captureEvent('intro_audio_failed', { platform: Platform.OS });
      }
    }, 3000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(retry1);
      clearTimeout(retry2);
      clearTimeout(failTimer);
      sub.remove();
      try { player.pause(); } catch { /* ignore */ }
      try { player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [audioUri]);

  return state;
}