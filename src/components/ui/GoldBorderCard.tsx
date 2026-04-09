import { type ReactNode, useEffect } from "react";
import { StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

type CardVariant = "gold" | "blue" | "green" | "purple" | "orange";

interface GoldBorderCardProps {
  children?: ReactNode;
  variant?: CardVariant;
  shimmer?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_COLORS: Record<
  CardVariant,
  { border: [string, string]; glow: string }
> = {
  gold: {
    border: ["#d4a017", "#f5c842"],
    glow: "rgba(212,160,23,0.15)",
  },
  blue: {
    border: ["#2563eb", "#60a5fa"],
    glow: "rgba(37,99,235,0.15)",
  },
  green: {
    border: ["#16a34a", "#4ade80"],
    glow: "rgba(22,163,74,0.15)",
  },
  purple: {
    border: ["#7c3aed", "#a78bfa"],
    glow: "rgba(124,58,237,0.15)",
  },
  orange: {
    border: ["#ea580c", "#fb923c"],
    glow: "rgba(234,88,12,0.15)",
  },
};

const BORDER_WIDTH = 2.5;

export function GoldBorderCard({
  children,
  variant = "gold",
  shimmer = false,
  style,
}: GoldBorderCardProps) {
  const shimmerProgress = useSharedValue(0);
  const colors = VARIANT_COLORS[variant];

  useEffect(() => {
    if (!shimmer) return;
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 2400 }),
      -1,
      false,
    );
    return () => cancelAnimation(shimmerProgress);
  }, [shimmer, shimmerProgress]);

  const shimmerStyle = useAnimatedStyle(() => {
    if (!shimmer) return { opacity: 0 };
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-200, 400],
    );
    return {
      opacity: 0.1,
      transform: [{ translateX }, { rotate: "25deg" }],
    };
  });

  return (
    <LinearGradient
      colors={colors.border as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.outerGradient, style]}
    >
      <View style={[styles.innerCard, { shadowColor: colors.glow }]}>
        {children}

        {/* Inner glow overlay */}
        <View
          style={[
            styles.glowOverlay,
            { backgroundColor: colors.glow },
          ]}
          pointerEvents="none"
        />

        {/* Shimmer stripe */}
        {shimmer && (
          <Animated.View
            style={[styles.shimmerStripe, shimmerStyle]}
            pointerEvents="none"
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerGradient: {
    borderRadius: 24,
    padding: BORDER_WIDTH,
  },
  innerCard: {
    backgroundColor: "rgba(10, 22, 40, 0.85)",
    borderRadius: 24 - BORDER_WIDTH,
    padding: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24 - BORDER_WIDTH,
  },
  shimmerStripe: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 60,
    backgroundColor: "#ffffff",
  },
});
