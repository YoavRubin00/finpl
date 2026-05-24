import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { ImageSource } from "expo-image";
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
} from "react-native-reanimated";
import {
  FINN_HELLO,
  FINN_HAPPY,
  FINN_TABLET,
  FINN_TALKING,
  FINN_DANCING,
  FINN_EMPATHIC,
  FINN_FIRE,
} from "../../retention-loops/finnMascotConfig";

export type SharkBannerMood =
  | "hello"
  | "happy"
  | "tablet"
  | "talking"
  | "dancing"
  | "empathic"
  | "fire";

interface SharkAccountantBannerProps {
  mood: SharkBannerMood;
  /** Optional speech bubble text. When omitted, no bubble is rendered. */
  bubbleText?: string;
  /** Optional smaller secondary line under the main bubble text. */
  bubbleSubtext?: string;
}

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

const MOOD_TO_SOURCE: Record<SharkBannerMood, ImageSource> = {
  hello: FINN_HELLO,
  happy: FINN_HAPPY,
  tablet: FINN_TABLET,
  talking: FINN_TALKING,
  dancing: FINN_DANCING,
  empathic: FINN_EMPATHIC,
  fire: FINN_FIRE,
};

export function SharkAccountantBanner({
  mood,
  bubbleText,
  bubbleSubtext,
}: SharkAccountantBannerProps) {
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(1);
  const bob = useSharedValue(0);

  const source = useMemo(() => MOOD_TO_SOURCE[mood], [mood]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breathe);
      cancelAnimation(bob);
      breathe.value = 1;
      bob.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1.04, { duration: 900 })),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1200 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(breathe);
      cancelAnimation(bob);
    };
  }, [breathe, bob, reduceMotion]);

  const finnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }, { translateY: bob.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={styles.container}
      pointerEvents="box-none"
    >
      {bubbleText ? (
        <Animated.View
          entering={FadeIn.delay(160).duration(260)}
          style={styles.bubbleWrap}
          pointerEvents="none"
        >
          <View style={styles.bubble}>
            <Text style={[styles.bubbleText, RTL]} allowFontScaling={false}>
              {bubbleText}
            </Text>
            {bubbleSubtext ? (
              <Text style={[styles.bubbleSubtext, RTL]} allowFontScaling={false}>
                {bubbleSubtext}
              </Text>
            ) : null}
          </View>
          <View style={styles.bubbleTail} />
        </Animated.View>
      ) : null}

      {/* Crop the top ~10% of the source WebP — the export has a small
          grime patch above the captain's head that ruins the silhouette.
          Wrapper clips, image is shifted up so only the dirty band is hidden.
          Matches the same crop pattern used in StockAnalystScreen's hero. */}
      <Animated.View style={[styles.finnWrap, finnStyle]}>
        <View style={styles.finnClip}>
          <ExpoImage
            source={source}
            accessible={false}
            style={styles.finn}
            contentFit="contain"
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  finnWrap: {
    width: 112,
    height: 101,
    alignItems: "center",
    justifyContent: "center",
  },
  finnClip: {
    width: 112,
    height: 101,
    overflow: "hidden",
  },
  finn: {
    width: 112,
    height: 112,
    marginTop: -11,
  },
  bubbleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  bubble: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0c4a6e",
    lineHeight: 20,
  },
  bubbleSubtext: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
    lineHeight: 17,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    marginRight: -1,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#ffffff",
  },
});
