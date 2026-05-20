import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-daily-return.mp4";

/** Cold-start intro splash: plays finn-daily-return for ~2s, tap to skip */
const DISPLAY_MS = 2000;

interface Props {
  onDismiss: () => void;
}

export function AppIntroSplash({ onDismiss }: Props) {
  const dismissedRef = useRef(false);

  const player = useVideoPlayer(VIDEO_URL, (p) => {
    p.loop = false;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.3,
    };
  });

  useEffect(() => {
    const dismissOnce = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      try { player.pause(); } catch { /* ignore */ }
      onDismiss();
    };

    try { player.play(); } catch { /* ignore */ }
    const timer = setTimeout(dismissOnce, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [player, onDismiss]);

  const handleTap = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try { player.pause(); } catch { /* ignore */ }
    onDismiss();
  };

  return (
    <Pressable
      style={styles.root}
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel="דלג למסך הראשי"
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="cover"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: "#0c1426",
  },
});
