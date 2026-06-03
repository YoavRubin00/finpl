import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

// Bundled locally (assets/video/finn-daily-return.mp4, ~680 KB) — was a
// Vercel Blob URL previously, which forced a cold-start network fetch that
// left the splash black on slow networks (user report 2026-06-03). Local
// require() lets the video appear instantly the moment the user opens the
// app and disappear cleanly at the 3s mark.
const VIDEO_SOURCE = require("../../../assets/video/finn-daily-return.mp4");

/** Cold-start intro splash: plays finn-daily-return for ~3s, tap to skip. */
const DISPLAY_MS = 3000;

interface Props {
  onDismiss: () => void;
}

export function AppIntroSplash({ onDismiss }: Props) {
  const dismissedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = false;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.3,
    };
  });

  // Mount-only effect — must NOT depend on `onDismiss` (recreated each parent
  // render) or `player` (recreated by useVideoPlayer). Re-running this effect
  // resets the auto-dismiss timer, leaving the splash stuck on screen with
  // zIndex 99999 blocking every button below. Read both via refs instead.
  const playerRef = useRef(player);
  playerRef.current = player;
  useEffect(() => {
    const dismissOnce = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      try { playerRef.current.pause(); } catch { /* ignore */ }
      onDismissRef.current();
    };

    try { playerRef.current.play(); } catch { /* ignore */ }
    const timer = setTimeout(dismissOnce, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleTap = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try { playerRef.current.pause(); } catch { /* ignore */ }
    onDismissRef.current();
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
