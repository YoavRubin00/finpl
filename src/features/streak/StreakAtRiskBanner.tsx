import { useCallback, useEffect, useMemo, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEconomyStore } from "../economy/useEconomyStore";

const DISMISSED_KEY = "streak_banner_dismissed_date";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Friendly inline nudge banner when streak is at risk — shows once per day max */
export function StreakAtRiskBanner() {
  const router = useRouter();
  const streak = useEconomyStore((s) => s.streak);
  const lastDailyTaskDate = useEconomyStore((s) => s.lastDailyTaskDate);
  const [dismissed, setDismissed] = useState(true); // hidden until we check storage

  // On mount, check if already dismissed today
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      setDismissed(val === todayISO());
    });
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, todayISO());
  }, []);

  const isAtRisk = useMemo(() => {
    if (streak <= 0) return false;
    if (lastDailyTaskDate === todayISO()) return false;
    const hour = new Date().getHours();
    return hour >= 18;
  }, [streak, lastDailyTaskDate]);

  // Subtle pulse animation
  const glowOpacity = useSharedValue(0.15);

  useEffect(() => {
    if (!isAtRisk) return;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1200 }),
        withTiming(0.15, { duration: 1200 })
      ),
      -1,
      true
    );
  }, [isAtRisk]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  if (!isAtRisk || dismissed) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14)}
      exiting={FadeOut.duration(200)}
      style={styles.wrap}
    >
      <Animated.View style={[styles.banner, glowStyle]}>
        {/* Dismiss X button */}
        <Pressable
          onPress={dismiss}
          style={styles.closeBtn}
          hitSlop={8}
        >
          <X size={14} color="#64748b" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/learn" as never)}
          style={styles.inner}
        >
          {/* Text on right (RTL) */}
          <View style={styles.textWrap}>
            <Text style={styles.title}>עוד לא השלמת פרק לימוד היום</Text>
            <Text style={styles.sub}>
              {streak} ימים ברצף — בוא נשמור על הקצב!
            </Text>
          </View>
          {/* Finn on left */}
          <ExpoImage source={FINN_STANDARD} style={{ width: 96, height: 96 }} contentFit="contain" />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 6,
  },
  banner: {
    backgroundColor: "#e0f2fe",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#7dd3fc",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0369a1",
    textAlign: "right",
    writingDirection: "rtl" as const,
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "right",
    writingDirection: "rtl" as const,
    lineHeight: 18,
  },
  finnEmoji: {
    fontSize: 32,
  },
});
