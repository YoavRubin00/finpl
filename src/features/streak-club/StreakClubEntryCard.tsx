import React, { useEffect } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Armchair, Lock } from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
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
import { LottieIcon } from "../../components/ui/LottieIcon";
import { toProxiedImageUri } from "../../lib/imageProxy";
import { SCENE_URI } from "./loungeConfig";

// אש-הרצף — הלוטי הקנוני של האפליקציה (במקום אמוג'י 🔥)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FIRE_LOTTIE = require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json") as number;

/**
 * מועדון הרצף — באדג'-הכניסה על מפת-הלמידה. יושב בשורת-הבאדג'ים מתחת
 * לכוכבי-האתגרים של השארק (ליד המונדיאל/חדשות), באותו דפוס בדיוק.
 * חבר מלא כבר מיום-1 (streak>=1, יואב 2.7): זהב פועם + נקודת-"חדש"
 * כשיש דרופ שלא נצפה היום. ההורה מגדר נראות (streak>=1 בלבד;
 * אורחים/streak=0 לא רואים כלום). מצב-נעול נשאר דורמנטי (streak<1).
 */
export function StreakClubEntryCard({
  streak,
  hasUnseenToday,
  onPress,
}: {
  streak: number;
  hasUnseenToday: boolean;
  onPress: () => void;
}): React.ReactElement {
  const { playSound } = useSoundEffect();
  const reduceMotion = useReducedMotion();
  const locked = streak < 1; // יום-1 פותח את הטרקלין המלא (יואב 2.7)
  const isNew = !locked && hasUnseenToday;

  // prefetch של סצנת-הטרקלין ברגע שהבאדג' נראה — הכניסה מרגישה מיידית
  useEffect(() => {
    if (locked || !SCENE_URI) return;
    void ExpoImage.prefetch(toProxiedImageUri(SCENE_URI), "memory-disk");
  }, [locked]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!isNew || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.07, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
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
        accessibilityLabel={
          locked
            ? "מועדון הרצף, נעול. מתחילים רצף ונכנסים"
            : isNew
              ? "מועדון הרצף, דרופ חדש מחכה"
              : "מועדון הרצף"
        }
        hitSlop={10}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={locked ? ["#475569", "#1e293b"] : ["#0e3a5c", "#052032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bg, !locked && styles.bgMember]}
        >
          {locked ? (
            <Lock size={20} color="#cbd5e1" strokeWidth={2.4} />
          ) : (
            <Armchair size={22} color="#fbbf24" strokeWidth={2.4} />
          )}
        </LinearGradient>
        {/* תג-פינה: לוטי-האש של הרצף (במקום אמוג'י) שממתג את הבאדג' */}
        <View style={styles.cornerTag} accessible={false}>
          <LottieIcon source={FIRE_LOTTIE} size={14} autoPlay loop active={!reduceMotion} />
        </View>
        {isNew && <View style={styles.newDot} accessible={false} />}
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
    shadowColor: "#b45309",
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
  bgMember: { borderColor: "rgba(251,191,36,0.65)" },
  cornerTag: {
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
  cornerTagText: { fontSize: 11, lineHeight: 14 },
  newDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
