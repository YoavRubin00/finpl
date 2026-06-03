import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

// Reverted to URL load 2026-06-03: the local require() change pulled in a
// new asset (the 680 KB mp4) that the production native binary doesn't
// know about. expo-updates was falling back to the binary's bundled JS
// silently because the new bundle's asset graph didn't match the binary's,
// which blocked every UI change in the same OTAs from reaching users.
// Re-bundle locally only once a fresh native binary ships.
const VIDEO_SOURCE =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-daily-return.mp4";

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
