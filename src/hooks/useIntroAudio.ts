import { useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

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
 * Also includes a reliability retry: if play() doesn't produce a 'playing' state
 * within 1500ms, we re-invoke play() once to work around the rare case where the
 * audio session wasn't ready on first call (observed on iOS cold-launch).
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

    // Reliability retry: if play() didn't produce a 'playing' event within 1.5s,
    // try once more. Fixes iOS cold-launch audio-session race.
    const retryTimer = setTimeout(() => {
      if (!hasStartedPlaying && !retriedRef.current) {
        retriedRef.current = true;
        try { player.play(); } catch { /* ignore */ }
      }
    }, 1500);

    return () => {
      clearTimeout(retryTimer);
      sub.remove();
      try { player.pause(); } catch { /* ignore */ }
      try { player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [audioUri]);

  return state;
}