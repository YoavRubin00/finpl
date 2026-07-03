import React, { useEffect } from "react";
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  cancelAnimation,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";

/**
 * כפתור-הזהב-הנוצץ הפרימיום — אותה חווית-משתמש כמו כפתור "פנטזי ליג"
 * ממסך-החברים (PremiumFantasyButton): גרדיאנט-זהב, ברק חולף, חץ. מופרד
 * לרכיב משותף כדי שנוכל להשתמש בו בכל CTA פרימיום (למשל פינאלת-הטרקלין).
 */
export function GoldShimmerButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [reduced, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.55, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-80, 80]) }],
  }));

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.outer, style, { opacity: pressed ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={["#fde68a", "#fbbf24", "#f59e0b", "#d97706"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.grad}
      >
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.85)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={styles.label} allowFontScaling={false}>{label}</Text>
        <Text style={styles.arrow} allowFontScaling={false}>‹</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    shadowColor: "#f59e0b",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  grad: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fcd34d",
    paddingHorizontal: 26,
    paddingVertical: 13,
    overflow: "hidden",
  },
  shimmer: { position: "absolute", top: 0, bottom: 0, width: 90 },
  label: { fontSize: 16, fontWeight: "900", color: "#7c2d12", writingDirection: "rtl" },
  arrow: { fontSize: 20, fontWeight: "900", color: "#7c2d12" },
});
