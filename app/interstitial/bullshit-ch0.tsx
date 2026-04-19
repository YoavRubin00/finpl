import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp, Easing } from "react-native-reanimated";
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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="המשיכו למודולה 4"
        >
          <Animated.View
            entering={FadeIn.duration(260)}
            style={styles.overlay}
            pointerEvents="box-none"
          >
            <Animated.View entering={FadeInUp.duration(480).easing(Easing.out(Easing.cubic))} style={styles.sheet} pointerEvents="box-none">
              <Animated.View entering={FadeIn.delay(140).duration(380).easing(Easing.out(Easing.cubic))}>
                <ExpoImage source={FINN_HAPPY} style={styles.finn} contentFit="contain" accessible={false} />
              </Animated.View>

              <Text style={[styles.speech, RTL]}>
                זו הסיבה שאני כאן, ללמוד איתכם אפקטיבית, יחד.
              </Text>

              <Pressable
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel="המשיכו למודולה 4"
                style={({ pressed }) => [styles.cta, pressed && { transform: [{ translateY: 2 }] }]}
              >
                <Text style={styles.ctaText}>המשך למודולה 4</Text>
              </Pressable>

              <Text style={[styles.tapHint, RTL]}>או הקישו בכל מקום להמשך</Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
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
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
    shadowColor: "#1e40af",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.3,
    writingDirection: "rtl",
    textAlign: "center",
  },
  tapHint: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});
