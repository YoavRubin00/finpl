import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { captureEvent } from '../lib/posthog';

export type IntroAudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'finished';

/**
 * Manages a single intro audio clip with tight sync to the Finn mascot.
 *
 * Returned state maps to visual behavior:
 *   - 'loading'  → before first playback frame
 *   - 'playing'  → audio actively playing, talking webp animates
 *   - 'paused'   → audio paused mid-clip (buffering / phone interruption), talking webp freezes
 *   - 'finished' → audio completed, switch to standard (mouth-closed) webp
 *
 * Reliability retries: iOS cold-launch sometimes drops the first play() before
 * the audio session is ready. We retry quickly at 400ms (most cases) and again
 * at 1000ms (slow networks) instead of waiting 1.5s — users were watching
 * Finn's mouth move silently for too long.
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
    const player = createAudioPlayer({ uri: audioUri });
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

    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      sub.remove();
      try { player.pause(); } catch { /* ignore */ }
      try { player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [audioUri]);

  return state;
}