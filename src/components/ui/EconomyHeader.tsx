import { View, Text, StyleSheet } from "react-native";
import { Zap, Coins, Flame, Crown, Plus } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedReaction,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const ZERO_SHADOW_OFFSET = { width: 0, height: 0 } as const;
import { useEffect, useRef, useState } from "react";
import { useEconomyStore } from "../../features/economy/useEconomyStore";
import { getPyramidStatus } from "../../utils/progression";
import { SPRING_SMOOTH } from "../../utils/animations";
import { heavyHaptic } from "../../utils/haptics";
import { CLASH } from "../../constants/theme";

const AnimatedText = Animated.createAnimatedComponent(Text);

// ---------------------------------------------------------------------------
// Animated counter hook — animates number from old → new over ~600ms
// ---------------------------------------------------------------------------

function useAnimatedCounter(value: number) {
  const animated = useSharedValue(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      animated.value = value;
      return;
    }
    animated.value = withSpring(value, {
      damping: 20,
      stiffness: 80,
      mass: 1,
    });
  }, [value]);

  return animated;
}

// ---------------------------------------------------------------------------
// AnimatedNumber — renders a number that springs between values
// ---------------------------------------------------------------------------

interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
}

function AnimatedNumber({ value, className, suffix }: AnimatedNumberProps) {
  const animatedVal = useAnimatedCounter(value);
  const [display, setDisplay] = useState(value.toLocaleString());

  useAnimatedReaction(
    () => Math.round(animatedVal.value),
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setDisplay)(current.toLocaleString());
      }
    },
    [animatedVal],
  );

  return (
    <Text className={className} style={s.pillText}>
      {display}
      {suffix}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Resource pill — icon in gold circle frame + bold number
// ---------------------------------------------------------------------------

interface ResourcePillProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  glowColor?: string;
  showPlus?: boolean;
}

function ResourcePill({ icon, children, glowColor, showPlus }: ResourcePillProps) {
  return (
    <View style={s.resourcePill}>
      <View
        style={[
          s.iconFrame,
          glowColor
            ? { shadowColor: glowColor, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 }
            : undefined,
        ]}
      >
        {icon}
      </View>
      {children}
      {showPlus && (
        <View style={s.plusBtn}>
          <Plus size={10} color="#fff" strokeWidth={3} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EconomyHeader
// ---------------------------------------------------------------------------

export function EconomyHeader() {
  const xp = useEconomyStore((s) => s.xp);
  const coins = useEconomyStore((s) => s.coins);
  const streak = useEconomyStore((s) => s.streak);

  const { layer, level, progressToNextLevel } = getPyramidStatus(xp);

  // ---- Animated progress bar width ----
  const progressAnim = useSharedValue(progressToNextLevel);
  const isFirstProgress = useRef(true);

  useEffect(() => {
    if (isFirstProgress.current) {
      isFirstProgress.current = false;
      progressAnim.value = progressToNextLevel;
      return;
    }
    progressAnim.value = withSpring(progressToNextLevel, SPRING_SMOOTH);
  }, [progressToNextLevel]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%`,
  }));

  // ---- Level-up flash ----
  const prevLevel = useRef(level);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (prevLevel.current !== level && prevLevel.current < level) {
      flashOpacity.value = withSequence(
        withTiming(0.6, { duration: 150 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
      heavyHaptic();
    }
    prevLevel.current = level;
  }, [level]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // ---- Progress bar fire glow (when streak ≥ 3) ----
  const barGlow = useSharedValue(0.3);

  useEffect(() => {
    if (streak >= 3) {
      barGlow.value = withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      );
      const interval = setInterval(() => {
        barGlow.value = withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        );
      }, 1600);
      return () => clearInterval(interval);
    } else {
      barGlow.value = 0;
    }
  }, [streak >= 3]);

  const barFireGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: barGlow.value,
    shadowColor: "#f97316",
    shadowRadius: 10,
    shadowOffset: ZERO_SHADOW_OFFSET,
    elevation: streak >= 3 ? 6 : 0,
  }));

  return (
    <View style={s.container}>
      {/* Level-up flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          flashStyle,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: CLASH.goldLight,
            zIndex: 10,
          },
        ]}
      />

      {/* Token row */}
      <View style={s.tokenRow}>
        {/* Level badge — far left */}
        <View style={s.levelBadge}>
          <Crown size={12} color={CLASH.goldLight} fill={CLASH.goldLight} />
          <Text style={s.levelText}>{level}</Text>
        </View>

        {/* XP pill */}
        <ResourcePill
          icon={<Zap size={13} color="#a78bfa" fill="#a78bfa" />}
          glowColor="#a78bfa"
        >
          <AnimatedNumber value={xp} suffix=" XP" />
        </ResourcePill>

        {/* Coins pill */}
        <ResourcePill
          icon={<Coins size={13} color={CLASH.goldLight} />}
          glowColor={CLASH.goldLight}
          showPlus
        >
          <AnimatedNumber value={coins} />
        </ResourcePill>

        {/* Streak pill (conditional) */}
        {streak > 0 && (
          <ResourcePill
            icon={
              <Flame
                size={13}
                color="#f97316"
                fill={streak >= 3 ? "#f97316" : "transparent"}
              />
            }
            glowColor="#f97316"
          >
            <Text style={s.pillText}>{streak}</Text>
          </ResourcePill>
        )}
      </View>

      {/* XP progress bar with gradient fill — fiery when streak ≥ 3 */}
      <Animated.View style={[s.progressTrack, streak >= 3 && barFireGlowStyle]}>
        <Animated.View style={[s.progressFill, progressBarStyle]}>
          <LinearGradient
            colors={streak >= 3 ? ["#ef4444", "#f97316", "#facc15"] : [CLASH.goldBorder, CLASH.goldLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 999 }}
          />
        </Animated.View>
        {/* Leading edge glow dot */}
        <Animated.View
          style={[
            progressBarStyle,
            {
              position: "absolute",
              top: -1,
              height: 8,
            },
          ]}
        >
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: streak >= 3 ? "#facc15" : CLASH.goldLight,
              shadowColor: streak >= 3 ? "#f97316" : CLASH.goldBorder,
              shadowOpacity: 0.8,
              shadowRadius: streak >= 3 ? 6 : 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: CLASH.bgPrimary,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    // "No-Line" Rule
    shadowColor: "#001b3d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    position: "relative",
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: CLASH.goldBorder,
    backgroundColor: CLASH.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: CLASH.goldBorder,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  levelText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 11,
    textShadowColor: CLASH.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: -1,
  },
  resourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10, 22, 40, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
  },
  iconFrame: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CLASH.goldBorder,
    backgroundColor: CLASH.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    textShadowColor: CLASH.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  plusBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: CLASH.greenBtn,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  progressTrack: {
    marginTop: 8,
    height: 6,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(42, 90, 140, 0.4)",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
});
