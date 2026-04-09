import { useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useSegments } from 'expo-router';
import { useAudioStore } from '../stores/useAudioStore';

// Routes where music should be silent
const SILENT_ROUTES = ['lesson', 'clash', 'bridge'];

export function useBackgroundMusic() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const segments = useSegments();
  const isVideoPlaying = useAudioStore((s) => s.isVideoPlaying);
  const musicEnabled = useAudioStore((s) => s.musicEnabled);

  const shouldBeSilent = !musicEnabled || SILENT_ROUTES.includes(segments[0] as string);

  useEffect(() => {
    const player = createAudioPlayer(
      { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/bg-music.mp3' }
    );
    player.loop = true;
    player.volume = 0.18;
    playerRef.current = player;

    if (!shouldBeSilent) {
      player.play();
      isPlayingRef.current = true;
    }

    return () => {
      player.release();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (shouldBeSilent || isVideoPlaying) {
      if (isPlayingRef.current) {
        player.pause();
        isPlayingRef.current = false;
      }
    } else {
      if (!isPlayingRef.current) {
        player.play();
        isPlayingRef.current = true;
      }
    }
  }, [shouldBeSilent, isVideoPlaying]);
}