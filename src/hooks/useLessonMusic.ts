import { useEffect, useRef, useState } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAudioStore } from '../stores/useAudioStore';

export function useLessonMusic() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isVideoPlaying = useAudioStore((s) => s.isVideoPlaying);

  useEffect(() => {
    const player = createAudioPlayer(
      { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/LEARN.mp3' }
    );
    player.loop = true;
    player.volume = 0.12;
    player.play();
    playerRef.current = player;

    return () => {
      try { player.pause(); player.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isVideoPlaying) {
      player.volume = 0;
    } else {
      player.volume = isMuted ? 0 : 0.12;
      // Resume after possible audio-session interruption caused by the video player
      try { player.play(); } catch { /* ignore */ }
    }
  }, [isMuted, isVideoPlaying]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  return { isMuted, toggleMute };
}