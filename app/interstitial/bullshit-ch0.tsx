import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp, Easing } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BullshitSwipeCard } from "../../src/features/finfeed/minigames/bullshit-swipe/BullshitSwipeCard";
import { FINN_HAPPY, FINN_STANDARD } from "../../src/features/retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../src/utils/haptics";
import { useTutorialStore } from "../../src/stores/useTutorialStore";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

export default function BullshitCh0InterstitialPage() {
  const router = useRouter();
  const hasSeenCh0Bullshit = useTutorialStore((s) => s.hasSeenCh0BullshitInterstitial);
  const markCh0BullshitSeen = useTutorialStore((s) => s.markCh0BullshitInterstitialSeen);
  // Intro overlay shown on first visit, immediately before the game starts.
  // Previously this lived in LessonFlowScreen and fired during the mod-0-3
  // summary phase, which left the chest/celebration screen between the
  // explanation and the game it was framing.
  const [showIntro, setShowIntro] = useState(!hasSeenCh0Bullshit);
  const [showSpeech, setShowSpeech] = useState(false);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
  }, []);

  const handleIntroDismiss = useCallback(() => {
    tapHaptic();
    markCh0BullshitSeen();
    setShowIntro(false);
  }, [markCh0BullshitSeen]);

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
        // Hide the paused game from screen readers + touches while the intro
        // overlay is up, so VoiceOver doesn't navigate into it underneath.
        accessibilityElementsHidden={showIntro}
        importantForAccessibility={showIntro ? "no-hide-descendants" : "auto"}
        pointerEvents={showIntro ? "none" : "auto"}
      >
        <BullshitSwipeCard
          isActive={!showIntro}
          bypassDailyGate
          onFinish={handleGameFinish}
        />
      </ScrollView>

      {showIntro && (
        <Pressable
          style={styles.introBackdrop}
          onPress={handleIntroDismiss}
          accessibilityViewIsModal
          accessibilityRole="button"
          accessibilityLabel="התחל את המשחק"
        >
          <Animated.View
            entering={FadeInUp.duration(350)}
            style={styles.introSheet}
            // Block backdrop-dismiss when the user taps inside the sheet itself.
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.introHeader}>
              <ExpoImage source={FINN_STANDARD} style={styles.introFinn} contentFit="contain" accessible={false} />
              <Text style={styles.introTitle}>קפטן שארק</Text>
            </View>
            <Text style={[styles.introBody, RTL]}>
              זו הסיבה שאני כאן. ללמד וללמוד ביחד איתך ולא למכור לך סיפורים.
            </Text>
            <Text style={[styles.introHint, RTL]}>
              מיד נתרגל ביחד, משחק "סוויפ הבולשיט" לזיהוי פרסומות מטעות. בואו נתחיל.
            </Text>
            <Pressable
              onPress={handleIntroDismiss}
              accessibilityRole="button"
              accessibilityLabel="המשך למשחק"
              style={({ pressed }) => [styles.introCta, pressed && { transform: [{ translateY: 2 }] }]}
            >
              <Text style={styles.introCtaText}>בואו נתחיל</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

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
  // Center the card vertically when content is shorter than the screen so the
  // header doesn't sit pinned to the top with elements clipping off above.
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  introBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3,7,18,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  introSheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#f0f9ff",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.45)",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  introHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  introFinn: {
    width: 54,
    height: 54,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "right",
  },
  introBody: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0c4a6e",
    lineHeight: 24,
    marginBottom: 16,
  },
  introHint: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 18,
  },
  introCta: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1d4ed8",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  introCtaText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "center",
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
    backgroundColor: "#1cb0f6",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#0a8fc4",
    shadowColor: "#1cb0f6",
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