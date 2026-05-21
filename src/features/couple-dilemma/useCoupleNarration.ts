import { useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * Plays the 5-second Daisy narration over the couple-dilemma video.
 *
 * Stripped-down version of usePodcastPlayer:
 *   - no progress / no seek / no pause-resume controls
 *   - auto-plays once `enabled` flips to true, fires onFinished, cleans up on unmount
 *
 * Audio plays in parallel with the (muted) video. Callers should pass
 * `enabled: false` until the video has at least one frame on screen, so the
 * user doesn't hear Daisy talking before they see her.
 */
export function useCoupleNarration(
  audioUri: string,
  onFinished?: () => void,
  options?: { enabled?: boolean },
): { isFinished: boolean } {
  const enabled = options?.enabled ?? true;
  const [isFinished, setIsFinished] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const finishedFiredRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!enabled) return;
    setIsFinished(false);
    finishedFiredRef.current = false;

    const player = createAudioPlayer({ uri: audioUri });
    playerRef.current = player;
    player.play();

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      const d = status.duration ?? 0;
      const t = status.currentTime ?? 0;
      const reachedEnd =
        status.didJustFinish || (d > 0 && t >= d - 0.25);
      if (reachedEnd && !finishedFiredRef.current) {
        finishedFiredRef.current = true;
        setIsFinished(true);
        onFinishedRef.current?.();
      }
    });

    return () => {
      sub.remove();
      try { player.pause(); } catch { /* ignore */ }
      try { player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [audioUri, enabled]);

  return { isFinished };
}
