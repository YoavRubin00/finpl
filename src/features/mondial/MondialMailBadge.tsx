import React, { useEffect } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Mail } from "lucide-react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";

/**
 * "מאחורי המונדיאל" mail badge — sits under Captain Shark's stars on the learn
 * map, beside the Breaking-News envelope. Themed green (vs the blue news badge)
 * with a small ⚽ so it reads as the World-Cup feature, not the news inbox.
 * Pulses + shows a red "new" dot until the user opens the carousel once
 * (`isNew`). Tapping opens the pearl-style MondialCarouselSheet (wired by the
 * parent). The parent gates visibility (returning user + launch date).
 */
export function MondialMailBadge({
  onPress,
  isNew = false,
}: {
  onPress: () => void;
  isNew?: boolean;
}): React.ReactElement {
  const { playSound } = useSoundEffect();
  const reduceMotion = useReducedMotion();

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!isNew || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [isNew, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const handlePress = () => {
    tapHaptic();
    playSound("btn_click_soft_2");
    onPress();
  };

  return (
    <Animated.View style={[styles.wrap, pulseStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={isNew ? "מאחורי המונדיאל, תוכן חדש" : "מאחורי המונדיאל"}
        hitSlop={10}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={["#16a34a", "#065f46"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bg}
        >
          <Mail size={22} color="#ffffff" strokeWidth={2.4} />
        </LinearGradient>
        {/* Soccer-ball corner tag — themes the envelope as the Mondial feature */}
        <View style={styles.ballTag} accessible={false}>
          <Text style={styles.ballTagText} allowFontScaling={false}>⚽</Text>
        </View>
        {isNew && <View style={styles.unreadDot} accessible={false} />}
      </Pressable>
    </Animated.View>
  );
}

const SIZE = 44;

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  pressable: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "visible",
    shadowColor: "#065f46",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  bg: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },
  ballTag: {
    position: "absolute",
    bottom: -3,
    left: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ballTagText: { fontSize: 11, lineHeight: 14 },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
