import { useEffect } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAudioStore } from '../stores/useAudioStore';

const MUSIC_URI =
  'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/LEARN.mp3';
const MUSIC_VOLUME = 0.12;

// Module-level SINGLETON — exactly ONE LEARN.mp3 player for the whole app.
// The old hook created a fresh `createAudioPlayer` on every mount with a LOCAL
// `isMuted` state, so re-mounts left orphaned players running and the mute
// toggle only affected one instance → "mute doesn't stop the music" (Yoav
// 2026-06-28). It also ignored the global `musicEnabled` setting entirely.
// Now: one player, controlled by the global (persisted) `musicEnabled`, and we
// REALLY pause when muted (volume=0 alone didn't reliably silence on device).
let player: AudioPlayer | null = null;
let refCount = 0;

function applyState(muted: boolean, videoPlaying: boolean): void {
  if (!player) return;
  try {
    if (muted || videoPlaying) {
      player.volume = 0;
      player.pause();
    } else {
      player.volume = MUSIC_VOLUME;
      player.play();
    }
  } catch {
    /* ignore */
  }
}

export function useLessonMusic() {
  const musicEnabled = useAudioStore((s) => s.musicEnabled);
  const toggleMusic = useAudioStore((s) => s.toggleMusic);
  const isVideoPlaying = useAudioStore((s) => s.isVideoPlaying);
  const isMuted = !musicEnabled;

  // Create the singleton on the first consumer; tear it down when the last one
  // unmounts (ref-counted so concurrent consumers don't spawn duplicates).
  useEffect(() => {
    refCount += 1;
    if (!player) {
      try {
        player = createAudioPlayer({ uri: MUSIC_URI });
        player.loop = true;
        player.volume = MUSIC_VOLUME;
      } catch {
        player = null;
      }
    }
    applyState(
      !useAudioStore.getState().musicEnabled,
      useAudioStore.getState().isVideoPlaying,
    );
    return () => {
      refCount -= 1;
      if (refCount <= 0) {
        refCount = 0;
        try {
          player?.pause();
          player?.remove();
        } catch {
          /* ignore */
        }
        player = null;
      }
    };
  }, []);

  // React to mute (global musicEnabled) and the video-playing duck.
  useEffect(() => {
    applyState(isMuted, isVideoPlaying);
  }, [isMuted, isVideoPlaying]);

  // `toggleMute` flips the global music setting so the lesson button, the
  // Settings music toggle, and the actual player all stay in sync (persisted).
  return { isMuted, toggleMute: toggleMusic };
}
