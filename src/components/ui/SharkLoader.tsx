import { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";

const RTL_CENTER = {
  writingDirection: "rtl" as const,
  textAlign: "center" as const,
};

/** Shimmer-bar widths — three bars reading as "content on its way". */
const BARS: ReadonlyArray<{ width: `${number}%`; height: number }> = [
  { width: "68%", height: 14 },
  { width: "88%", height: 44 },
  { width: "76%", height: 14 },
];

interface ShimmerBarProps {
  index: number;
  width: `${number}%`;
  height: number;
  reduceMotion: boolean;
}

/** The AnalyzingState pulse recipe (the in-house premium skeleton). */
function ShimmerBar({ index, width, height, reduceMotion }: ShimmerBarProps) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0.6;
      return;
    }
    pulse.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 720, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.45, { duration: 720, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      entering={FadeIn.delay(index * 120).duration(260)}
      style={[styles.bar, { width, height }, animatedStyle]}
    />
  );
}

interface SharkLoaderProps {
  /** Big line. Default keeps the shark's voice: short, calm, singular-neutral. */
  title?: string;
  /** Optional smaller line under the title (e.g. "קפטן שארק מכין את הכרטיסיות"). */
  subtitle?: string;
  /** `overlay` = absolute-fill scrim (drop-in for full-cover loading states);
   *  `inline` = centered block inside the parent. */
  variant?: "overlay" | "inline";
  /** Analytics context; when set, fires `content_loader_shown`
   *  { context, duration_ms, hit_cap } on unmount. */
  context?: string;
  /** The call-site's loading cap in ms — lets `hit_cap` mark loads that ran
   *  the full cap (i.e. the network lost the race) vs. fast-path dismissals. */
  capMs?: number;
}

/**
 * Branded loading state — Captain Shark breathing + staggered shimmer bars.
 * Replaces bare ActivityIndicator/"טוען..." states on the core loop (the
 * app-store review that triggered this: "הטעינות... קלמזי").
 */
export function SharkLoader({
  title = "עוד רגע…",
  subtitle,
  variant = "inline",
  context,
  capMs,
}: SharkLoaderProps) {
  const reduceMotion = useReducedMotion();

  // Gentle breathing on the mascot (mirrors ProfilingFlow's idle bounce).
  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(breath);
    };
  }, [breath, reduceMotion]);
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  // Proof-of-impact wire: how long users actually stare at this loader.
  const shownAtRef = useRef(Date.now());
  const contextRef = useRef(context);
  contextRef.current = context;
  const capRef = useRef(capMs);
  capRef.current = capMs;
  useEffect(() => {
    return () => {
      if (!contextRef.current) return;
      const durationMs = Date.now() - shownAtRef.current;
      try {
        captureEvent("content_loader_shown", {
          context: contextRef.current,
          duration_ms: durationMs,
          hit_cap: capRef.current != null ? durationMs >= capRef.current - 100 : false,
        });
      } catch { /* non-fatal */ }
    };
  }, []);

  return (
    <View
      style={variant === "overlay" ? styles.overlay : styles.inline}
      pointerEvents={variant === "overlay" ? "auto" : "none"}
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={breathStyle}>
        <ExpoImage
          source={FINN_STANDARD}
          style={styles.mascot}
          contentFit="contain"
          accessible={false}
        />
      </Animated.View>
      <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.bars}>
        {BARS.map((bar, i) => (
          <ShimmerBar
            key={i}
            index={i}
            width={bar.width}
            height={bar.height}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    zIndex: 50,
    paddingHorizontal: 32,
  },
  inline: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  mascot: {
    width: 96,
    height: 96,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },
  bars: {
    marginTop: 18,
    width: "78%",
    maxWidth: 300,
    gap: 10,
    alignItems: "center",
  },
  bar: {
    backgroundColor: "#c7d8e8",
    borderRadius: 8,
  },
});
