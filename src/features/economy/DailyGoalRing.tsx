import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  useReducedMotion,
  Easing,
} from "react-native-reanimated";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { useDailyGoalStore } from "./useDailyGoalStore";
import { successHaptic } from "../../utils/haptics";

/**
 * מטרת היום — the daily-XP-goal ring. Fills as the user earns XP today; at
 * 100% it celebrates once (confetti + haptic) and flips to a glowing gold
 * "מצב על" (overachiever) state past the goal.
 *
 * Colour: brand sea-blue (XP) → gold (מצב על). NEVER the reserved energy
 * purple — energy is its own currency (see features/energy/energyTheme.ts).
 */

const XP_BLUE = "#3b82f6";
const OVER_GOLD = "#f59e0b";
const TRACK = "#e2e8f0";
const CENTER_TEXT = "#1e3a8a";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function DailyGoalRing({
  size = 56,
  caption,
}: {
  size?: number;
  /** Optional label under the ring (e.g. on the lesson summary). */
  caption?: string;
}) {
  const reduceMotion = useReducedMotion();
  const xpToday = useDailyGoalStore((s) => s.xpToday);
  const goalXp = useDailyGoalStore((s) => s.goalXp);
  const pendingCelebration = useDailyGoalStore((s) => s.pendingGoalCelebration);
  const clearCelebration = useDailyGoalStore((s) => s.clearGoalCelebration);

  const ratio = goalXp > 0 ? xpToday / goalXp : 0;
  const isOver = ratio >= 1;
  const progress = Math.max(0, Math.min(1, ratio));

  const stroke = Math.max(4, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProgress = useSharedValue(progress);
  const glow = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = reduceMotion
      ? progress
      : withTiming(progress, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, reduceMotion, animatedProgress]);

  // Gentle breathing glow while in "מצב על".
  useEffect(() => {
    if (isOver && !reduceMotion) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.35, { duration: 900 })
        ),
        -1,
        false
      );
    } else {
      glow.value = withTiming(isOver ? 0.8 : 0, { duration: 300 });
    }
  }, [isOver, reduceMotion, glow]);

  // Celebrate the crossing once, then clear the one-shot flag.
  useEffect(() => {
    if (pendingCelebration) {
      try { successHaptic(); } catch { /* haptics best-effort */ }
    }
  }, [pendingCelebration]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const ringColor = isOver ? OVER_GOLD : XP_BLUE;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar"
      accessibilityLabel={`מטרת היום: ${xpToday} מתוך ${goalXp} נקודות${isOver ? ", הושלם — מצב על" : ""}`}
      accessibilityValue={{ min: 0, max: goalXp, now: Math.min(xpToday, goalXp) }}
    >
      <View style={{ width: size, height: size }}>
        {/* Soft glow halo behind the ring while overachieving */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, shadowColor: OVER_GOLD, left: -7, top: -7 },
            glowStyle,
          ]}
        />
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle cx={cx} cy={cy} r={r} stroke={TRACK} strokeWidth={stroke} fill="none" />
          {/* Progress arc — starts at 12 o'clock */}
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={ringProps}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        {/* Center label */}
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.value, { color: isOver ? OVER_GOLD : CENTER_TEXT, fontSize: Math.round(size * 0.26) }]}>
            {isOver ? "★" : xpToday}
          </Text>
          {!isOver && (
            <Text style={[styles.goal, { fontSize: Math.round(size * 0.16) }]}>/{goalXp}</Text>
          )}
        </View>
        {pendingCelebration && (
          <View style={styles.confetti} pointerEvents="none">
            <ConfettiExplosion onComplete={clearCelebration} />
          </View>
        )}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: "transparent",
    elevation: 0,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
  },
  value: { fontWeight: "900", fontVariant: ["tabular-nums"] },
  goal: { fontWeight: "700", color: "#94a3b8", marginBottom: 2 },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    writingDirection: "rtl",
  },
});
