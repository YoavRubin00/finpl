import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

// Bundled locally (assets/splash/finn-daily-return.mp4, ~680 KB) so the
// splash plays from disk and appears instantly on app open instead of
// the 2-3 s blank wait we saw when loading the clip from Vercel Blob.
// Lives under assets/splash/ (NOT assets/video/) because gitignore +
// easignore both exclude assets/video/, and a !file negation under an
// excluded parent directory is a no-op in both tools — EAS strips the
// file from the upload tarball and Metro bundling fails. The mp4 was
// the only required file in assets/video/, so relocating it sidesteps
// the directory exclusion entirely.
// Note: this asset is brand-new to the JS bundle's asset graph, so
// existing native binaries built BEFORE this commit cannot apply OTAs
// that reference it. Ship this only inside a fresh native build
// (eas build --platform android --profile preview / production --auto-submit).
const VIDEO_SOURCE = require("../../../assets/splash/finn-daily-return.mp4");

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
