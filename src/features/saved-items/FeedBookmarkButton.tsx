import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Bookmark } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FeedItem } from "../finfeed/types";
import { useFeedBookmark } from "./useFeedBookmark";

type Variant = "dark" | "light";

interface Props {
  item: FeedItem;
  variant?: Variant;
  /** Override default top offset (safe-area + 12) for cards that need a custom anchor. */
  topOffset?: number;
  /** Visual left offset; default 16. */
  leftOffset?: number;
}

const VARIANT_STYLES: Record<Variant, { bg: string; iconColor: string; savedFill: string }> = {
  dark: { bg: "rgba(0,0,0,0.45)", iconColor: "#ffffff", savedFill: "#facc15" },
  light: { bg: "rgba(255,255,255,0.92)", iconColor: "#0c4a6e", savedFill: "#16a34a" },
};

function sparkleTransform(progress: number, angleDeg: number) {
  "worklet";
  const distance = progress * 22;
  const opacity = progress > 0 && progress < 1 ? 1 - progress : 0;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    opacity,
    transform: [
      { translateX: Math.cos(rad) * distance },
      { translateY: Math.sin(rad) * distance },
      { scale: 0.4 + progress * 0.8 },
    ],
  };
}

/**
 * Universal bookmark button for any feed card. Position is absolute, top-left
 * (visual ↖ in RTL — does not collide with FeedSidebar at right rail).
 *
 * Visible to all users; non-PRO tap → UpgradeModal via the hook.
 */
export function FeedBookmarkButton({ item, variant = "dark", topOffset, leftOffset = 16 }: Props) {
  const insets = useSafeAreaInsets();
  const { isBookmarked, toggle } = useFeedBookmark(item);
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(1);
  const sparkleProgress = useSharedValue(0);
  const lastBookmarked = useSharedValue(isBookmarked);

  // Trigger sparkle when transitioning from not-saved → saved.
  useEffect(() => {
    if (isBookmarked && !lastBookmarked.value) {
      if (!reduceMotion) {
        sparkleProgress.value = 0;
        sparkleProgress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
      }
    }
    lastBookmarked.value = isBookmarked;
  }, [isBookmarked, reduceMotion, sparkleProgress, lastBookmarked]);

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100, easing: Easing.out(Easing.quad) });
  };
  const handlePressOut = () => {
    if (reduceMotion) {
      scale.value = withTiming(1, { duration: 100 });
    } else {
      scale.value = withSequence(
        withSpring(1.18, { damping: 11, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Three radial sparkle hooks at fixed angles (must be top-level).
  const sparkleA = useAnimatedStyle(() => sparkleTransform(sparkleProgress.value, 0));
  const sparkleB = useAnimatedStyle(() => sparkleTransform(sparkleProgress.value, 60));
  const sparkleC = useAnimatedStyle(() => sparkleTransform(sparkleProgress.value, 120));
  const sparkleStyles = [sparkleA, sparkleB, sparkleC];

  const palette = VARIANT_STYLES[variant];
  const fillColor = isBookmarked ? palette.savedFill : "transparent";
  const iconColor = isBookmarked ? palette.savedFill : palette.iconColor;
  const top = topOffset ?? insets.top + 12;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { top, left: leftOffset },
        buttonStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={toggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? "הסר מהשמורים" : "שמור"}
        accessibilityState={{ selected: isBookmarked }}
        style={[styles.button, { backgroundColor: palette.bg }]}
      >
        <Bookmark size={20} color={iconColor} fill={fillColor} />
      </Pressable>
      {/* Sparkles — three radial dots emerge on save */}
      {!reduceMotion ? (
        <View pointerEvents="none" style={styles.sparkleHost}>
          {sparkleStyles.map((sparkleStyle, i) => (
            <Animated.View
              key={i}
              style={[styles.sparkle, sparkleStyle]}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  sparkleHost: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#facc15",
  },
});