import { type ReactNode, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

interface GoldCircleBadgeProps {
  children?: ReactNode;
  size?: number;
  borderColor?: string;
  glowing?: boolean;
  badge?: number;
}

const BORDER_WIDTH = 3;
const BADGE_SIZE = 20;

export function GoldCircleBadge({
  children,
  size = 48,
  borderColor = "#d4a017",
  glowing = false,
  badge,
}: GoldCircleBadgeProps) {
  const glowRadius = useSharedValue(8);

  useEffect(() => {
    if (!glowing) return;
    glowRadius.value = withRepeat(
      withSequence(
        withTiming(16, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowRadius);
  }, [glowing, glowRadius]);

  const glowStyle = useAnimatedStyle(() => {
    if (!glowing) return {};
    return {
      shadowRadius: glowRadius.value,
    };
  });

  const outerSize = size;
  const innerSize = size - BORDER_WIDTH * 2;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderColor,
            shadowColor: borderColor,
          },
          glowing && styles.glowBase,
          glowStyle,
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {children}
        </View>
      </Animated.View>

      {badge !== undefined && badge > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {badge > 99 ? "99+" : String(badge)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  circle: {
    borderWidth: BORDER_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  glowBase: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    elevation: 8,
  },
  inner: {
    backgroundColor: "#0d2847",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#0d2847",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
  },
});
