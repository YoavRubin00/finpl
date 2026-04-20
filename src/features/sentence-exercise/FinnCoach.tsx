import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useEffect } from "react";
import { getFinnImage } from "../retention-loops/finnMascotConfig";
import type { FinnMood } from "./sentenceTypes";

interface FinnCoachProps {
  mood: FinnMood;
  message: string;
  accentColor: string;
}

const MOOD_TO_STATE: Record<FinnMood, Parameters<typeof getFinnImage>[0]> = {
  standard: "idle",
  happy: "celebrate",
  empathic: "empathy",
  fire: "fire",
  dancing: "dancing",
  talking: "idle",
};

const MOOD_BORDER: Record<FinnMood, string> = {
  standard: "#93c5fd",
  happy: "#34d399",
  empathic: "#fbbf24",
  fire: "#f97316",
  dancing: "#a78bfa",
  talking: "#93c5fd",
};

const MOOD_BG: Record<FinnMood, string> = {
  standard: "#eff6ff",
  happy: "#ecfdf5",
  empathic: "#fffbeb",
  fire: "#fff7ed",
  dancing: "#f5f3ff",
  talking: "#eff6ff",
};

export function FinnCoach({ mood, message, accentColor }: FinnCoachProps) {
  const reducedMotion = useReducedMotion();
  const borderColor = MOOD_BORDER[mood] ?? accentColor;
  const bubbleBg = MOOD_BG[mood] ?? "#eff6ff";

  const portraitScale = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    portraitScale.value = withSequence(
      withTiming(1.08, { duration: 120 }),
      withTiming(1, { duration: 180 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  const portraitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: portraitScale.value }],
  }));

  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      {message.length > 0 && (
        <Animated.View
          key={`${mood}:${message}`}
          entering={reducedMotion ? undefined : FadeInUp.duration(220).springify()}
          exiting={FadeOut.duration(160)}
          style={[styles.bubble, { borderColor, backgroundColor: bubbleBg }]}
          accessibilityRole="text"
          accessibilityLabel={`קפטן שארק: ${message}`}
        >
          <Text style={styles.bubbleText}>{message}</Text>
          <View style={[styles.tail, { borderRightColor: borderColor }]} />
        </Animated.View>
      )}

      <Animated.View style={portraitStyle}>
        <ExpoImage
          source={getFinnImage(MOOD_TO_STATE[mood])}
          style={styles.portrait}
          contentFit="contain"
          accessible={false}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 4,
  },
  portrait: {
    width: 96,
    height: 96,
  },
  bubble: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
  },
  // Left-pointing tail: in row-reverse, bubble is FIRST child (rightmost), portrait is SECOND (leftmost)
  tail: {
    position: "absolute",
    left: -10,
    bottom: 18,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
});