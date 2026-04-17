import { type ReactNode, useCallback, useEffect } from "react";
import { Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
  useReducedMotion,
} from "react-native-reanimated";
import { SPRING_SNAPPY } from "../../utils/animations";
import { STITCH } from "../../constants/theme";

interface GlowCardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Glow color. Default neon-violet (#a78bfa). */
  glowColor?: string;
  /** Chapter-specific glow color. When provided, overrides glowColor. */
  chapterGlow?: string;
  /** Enable shimmer sweep animation (for premium/Pro items). */
  shimmer?: boolean;
  /** Make the card pressable with glow intensify on press. Default true. */
  pressable?: boolean;
  /** Press callback. */
  onPress?: () => void;
  /** Accessibility label for screen readers. */
  accessibilityLabel?: string;
}

export function GlowCard({
  children,
  style,
  className,
  glowColor = STITCH.secondaryPurple,
  chapterGlow,
  shimmer = false,
  pressable = true,
  onPress,
  accessibilityLabel,
}: GlowCardProps) {
  const reduceMotion = useReducedMotion();
  const effectiveGlowColor = chapterGlow ?? glowColor;
  const glowIntensity = useSharedValue(0.20);
  const shimmerProgress = useSharedValue(0);
  // Stable object reference to prevent Reanimated from triggering setState every frame on web
  const ZERO_OFFSET = { width: 0, height: 0 } as const;

  // Shimmer loop
  useEffect(() => {
    if (!shimmer || reduceMotion) return;
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 2400 }),
      -1,
      false,
    );
    return () => cancelAnimation(shimmerProgress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shimmer]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: effectiveGlowColor,
    borderWidth: 0.5,
    shadowColor: effectiveGlowColor,
    shadowOffset: ZERO_OFFSET,
    shadowOpacity: glowIntensity.value,
    shadowRadius: interpolate(glowIntensity.value, [0.20, 0.8], [6, 14]),
    elevation: interpolate(glowIntensity.value, [0.20, 0.8], [3, 10]),
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    if (!shimmer) return { opacity: 0 };
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-200, 400],
    );
    return {
      opacity: 0.08,
      transform: [{ translateX }, { rotate: "25deg" }],
    };
  });

  const handlePressIn = useCallback(() => {
    if (!pressable || reduceMotion) return;
    glowIntensity.value = withSpring(0.8, SPRING_SNAPPY);
  }, [pressable, reduceMotion, glowIntensity]);

  const handlePressOut = useCallback(() => {
    if (!pressable || reduceMotion) return;
    glowIntensity.value = withSpring(0.20, SPRING_SNAPPY);
  }, [pressable, reduceMotion, glowIntensity]);

  const card = (
    <Animated.View
      style={[styles.card, cardAnimatedStyle, style]}
      className={className}
      onTouchStart={pressable ? handlePressIn : undefined}
      onTouchEnd={pressable ? handlePressOut : undefined}
      onTouchCancel={pressable ? handlePressOut : undefined}
    >
      {children}
      {shimmer && (
        <Animated.View
          style={[styles.shimmerStripe, shimmerStyle]}
          pointerEvents="none"
        />
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ borderRadius: 24 }} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 24,
    padding: 24, // increased padding slightly to match softer corner
    overflow: "hidden",
  },
  shimmerStripe: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 60,
    backgroundColor: STITCH.surfaceLowest,
  },
});
