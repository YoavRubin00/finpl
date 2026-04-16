import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Crown } from "lucide-react-native";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";

type BadgeSize = "sm" | "md" | "lg";

interface ProBadgeProps {
  size?: BadgeSize;
}

const SIZES: Record<BadgeSize, { crown: number; text: number; px: number; py: number; gap: number }> = {
  sm: { crown: 10, text: 8, px: 6, py: 2, gap: 2 },
  md: { crown: 14, text: 11, px: 10, py: 4, gap: 3 },
  lg: { crown: 18, text: 14, px: 14, py: 6, gap: 4 },
};

export function ProBadge({ size = "sm" }: ProBadgeProps) {
  const s = SIZES[size];
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (size === "lg") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
    return () => { cancelAnimation(pulse); };
  }, [size, pulse]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const showGlow = size === "md" || size === "lg";

  return (
    <Animated.View style={[showGlow && styles.glowWrap, animStyle]}>
      <LinearGradient
        colors={["#facc15", "#f59e0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.pill,
          {
            paddingHorizontal: s.px,
            paddingVertical: s.py,
            gap: s.gap,
          },
        ]}
      >
        <Crown size={s.crown} color="#1a1035" fill="#1a1035" />
        <Text style={[styles.text, { fontSize: s.text }]}>PRO</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
  },
  text: {
    fontWeight: "900",
    color: "#1a1035",
    letterSpacing: 0.5,
  },
  glowWrap: {
    shadowColor: "#f59e0b",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
