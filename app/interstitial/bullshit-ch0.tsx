import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BullshitSwipeCard } from "../../src/features/finfeed/minigames/bullshit-swipe/BullshitSwipeCard";
import { FINN_HAPPY } from "../../src/features/retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../src/utils/haptics";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

export default function BullshitCh0InterstitialPage() {
  const router = useRouter();
  const [showSpeech, setShowSpeech] = useState(false);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
  }, []);

  const handleGameFinish = useCallback(() => {
    successHaptic();
    speechTimerRef.current = setTimeout(() => setShowSpeech(true), 1400);
  }, []);

  const handleContinue = useCallback(() => {
    tapHaptic();
    router.replace({
      pathname: "/lesson/[id]",
      params: { id: "mod-0-4", chapterId: "chapter-0" },
    } as never);
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BullshitSwipeCard
          isActive
          bypassDailyGate
          onFinish={handleGameFinish}
        />
      </ScrollView>

      {showSpeech && (
        <Animated.View
          entering={FadeIn.duration(260)}
          style={styles.overlay}
          pointerEvents="auto"
        >
          <Animated.View entering={SlideInDown.springify().damping(16)} style={styles.sheet}>
            <Animated.View entering={ZoomIn.delay(120).springify().damping(10)}>
              <ExpoImage source={FINN_HAPPY} style={styles.finn} contentFit="contain" accessible={false} />
            </Animated.View>

            <Text style={[styles.speech, RTL]}>
              זו הסיבה שאני כאן — ללמוד איתכם אפקטיבית, יחד.
            </Text>

            <Pressable
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="המשיכו למודולה 4"
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ translateY: 2 }] }]}
            >
              <Text style={styles.ctaText}>המשך למודולה 4</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 32,
    alignItems: "center",
    gap: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  finn: {
    width: 120,
    height: 120,
  },
  speech: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 26,
    writingDirection: "rtl",
    paddingHorizontal: 8,
  },
  cta: {
    alignSelf: "stretch",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    shadowColor: "#0284c7",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.3,
    writingDirection: "rtl",
  },
});
