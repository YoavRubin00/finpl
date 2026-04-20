import { useState, useCallback, useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useRouter, useSegments } from "expo-router";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useAuthStore } from "../auth/useAuthStore";
import { FINN_HELLO } from "../retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type ScreenSignal = 'learn' | 'lesson-preview' | 'feed' | 'chat' | 'shop' | 'bridge' | null;

interface WalkthroughStep {
  title: string;
  emoji: string;
  message: string;
  navigateTo: string | null;
  ctaLabel: string;
  screenSignal: ScreenSignal;
  audioUrl?: string;
  isLast?: boolean;
}

const STEPS: WalkthroughStep[] = [
  {
    title: "היי! אני קפטן שארק",
    emoji: "",
    message: "אני אלווה אתכם לאורך כל הדרך.\nבואו נעשה סיור קצר באפליקציה!",
    navigateTo: null,
    ctaLabel: "יאללה, קדימה!",
    screenSignal: null,
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-0-kOK18ZhYnb8UPxoe5Ebxp4rvNdNmqW.mp3",
  },
  {
    title: "מסלול הלמידה",
    emoji: "📚",
    message: "כאן מסלול הלמידה שלכם. שיעורים, חידונים וסימולציות שיהפכו אתכם למומחים פיננסיים.",
    navigateTo: "/(tabs)/index",
    ctaLabel: "מה נלמד באפליקציה?",
    screenSignal: "learn",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-1-NaswjWGVR7sUYk9zEIq52y2EGFxnue.mp3",
  },
  {
    title: "מה נלמד באפליקציה?",
    emoji: "🎓",
    message: "6 פרקים, מאפס ועד מומחה. כל מה שצריך כדי להבין את עולם הכסף. גללו למטה ותראו!",
    navigateTo: "/(tabs)/index",
    ctaLabel: "עכשיו לפיד",
    screenSignal: "lesson-preview",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-2-pdqXZwiv2qVntQy0hzWaQnkaj6cPbV.mp3",
  },
  {
    title: "הפיד היומי",
    emoji: "🎯",
    message: "כאן תמצאו משחקים יומיים, דילמות כלכליות, מיתוסים ותוכן שמתעדכן כל יום.",
    navigateTo: "/(tabs)/learn",
    ctaLabel: "המשך",
    screenSignal: "feed",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-3-zwq7Ob4c2qz5wXEFANX40AzefZ9hu9.mp3",
  },
  {
    title: "תבחרו סגנון לשארק",
    emoji: "",
    message: "לפני שנמשיך, תבחרו איך תרצו ששארק ידבר איתכם! חכם? ישיר? חם? אנליטי?",
    navigateTo: "/(tabs)/chat",
    ctaLabel: "יאללה לבחור!",
    screenSignal: "chat",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-4-w8O4mJUove3xxf8REvE8tXRchgcyuD.mp3",
  },
  {
    title: "הצ'אט של שארק",
    emoji: "💬",
    message: "כאן תוכלו לדבר על כל מה שקשור לכסף. שארק תמיד פה לשאלות והסברים.",
    navigateTo: null,
    ctaLabel: "לחנות",
    screenSignal: "chat",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-5-izvyJZVophx4OdIJ5P7pInn0trmiD5.mp3",
  },
  {
    title: "החנות",
    emoji: "🏪",
    message: "כאן תוכלו להשתמש במטבעות הזהב שצברתם. אייטמים, בוסטרים ועוד. מרוויחים זהב דרך למידה!",
    navigateTo: "/(tabs)/shop",
    ctaLabel: "ומה עם הגשר?",
    screenSignal: "shop",
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-6-AChQLzDxn8DEVzZQ5rx2cRnfQCpibW.mp3",
  },
  {
    title: "הגשר",
    emoji: "🌉",
    message: "הידע שלכם שווה כסף אמיתי! בגשר תמירו את המטבעות שצברתם להטבות ומוצרים פיננסיים בעולם האמיתי.",
    navigateTo: "/bridge",
    ctaLabel: "בוא נתחיל ללמוד!",
    screenSignal: "bridge",
    isLast: true,
    audioUrl: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/walkthrough/step-7-7rr5fmPQ7ZVwKa6BczIDjwsShoKQL0.mp3",
  },
];

// ---------------------------------------------------------------------------
// Exported hooks
// ---------------------------------------------------------------------------

export function useWalkthroughGlowTab(): string | null {
  return useTutorialStore((s) => s.walkthroughGlowTab ?? null);
}

export function useWalkthroughGlowTarget(): "none" | "tab-learn" | "tab-investments" | "profile-avatar" | "bridge-cta" {
  return "none";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Pulsing glow behind Finn avatar
function FinnPulse() {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(withTiming(1.25, { duration: 1800 }), -1, true);
  }, [reducedMotion, pulse]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value, // 1.0 → 0.75
  }));

  return <Animated.View style={[s.finnGlow, animStyle]} />;
}

export function AppWalkthroughOverlay() {
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const step = useTutorialStore((s) => s.appWalkthroughStep);
  const setStep = useTutorialStore((s) => s.setAppWalkthroughStep);
  const completeWalkthrough = useTutorialStore((s) => s.completeAppWalkthrough);
  const router = useRouter();
  const segments = useSegments();
  const [transitioning, setTransitioning] = useState(false);
  const reducedMotion = useReducedMotion();
  // Delay walkthrough by 2 seconds, only for the initial step
  const [ready, setReady] = useState(step > 0);
  useEffect(() => {
    if (hasSeenWalkthrough || ready) return;
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, [hasSeenWalkthrough, ready]);
  // Track whether user pressed CTA on the chat-style step and is now choosing
  const [waitingForChatChoice, setWaitingForChatChoice] = useState(false);
  // Key to force re-mount of content for enter/exit animation between steps
  const [contentKey, setContentKey] = useState(0);
  const isMinor = useAuthStore((s) => s.profile?.ageGroup === "minor");

  // Filter out Bridge step for minors (legal protection, no real-money features)
  const activeSteps = isMinor ? STEPS.filter((s) => s.screenSignal !== "bridge") : STEPS;
  // Mark the new last step
  const stepsWithLast = activeSteps.map((s, i) => i === activeSteps.length - 1 ? { ...s, isLast: true } : { ...s, isLast: false });

  const stepConfig = step >= 0 && step < stepsWithLast.length ? stepsWithLast[step] : null;

  const setActiveScreen = useTutorialStore((s) => s.setWalkthroughActiveScreen);
  const hasChosenChatStyle = useTutorialStore((s) => s.hasChosenChatStyle);

  // Auto-advance from step 4 → 5 once user has chosen a chat style
  useEffect(() => {
    if (step === 4 && waitingForChatChoice && hasChosenChatStyle) {
      setWaitingForChatChoice(false);
      setStep(5);
      setContentKey((k) => k + 1);
      setActiveScreen("chat");
    }
  }, [step, waitingForChatChoice, hasChosenChatStyle, setStep, setActiveScreen]);

  // Audio Playback, narrow deps to audioUrl only so stepConfig reference
  // changes (from .map() each render) don't re-create the player every render.
  const stepAudioUrl = stepConfig?.audioUrl;
  useEffect(() => {
    let playerObj: AudioPlayer | null = null;

    if (stepAudioUrl && ready && !waitingForChatChoice) {
      try {
        const player = createAudioPlayer({ uri: stepAudioUrl });
        player.play();
        playerObj = player;
      } catch { /* audio playback failed, silent */ }
    }

    return () => {
      if (playerObj) {
        try { playerObj.pause(); playerObj.remove(); } catch { /* ignore */ }
      }
    };
  }, [stepAudioUrl, ready, waitingForChatChoice]);

  /** Check if we're already on the target route to avoid redundant navigation */
  const isAlreadyOnRoute = useCallback((target: string | null) => {
    if (!target) return true;
    const currentPath = "/" + segments.join("/");
    // Normalize: /(tabs)/index → /(tabs)/index, /(tabs) → /(tabs)
    return currentPath === target || currentPath === target.replace(/\/index$/, "");
  }, [segments]);


  const handleNext = useCallback(() => {
    if (transitioning) return;
    tapHaptic();

    // Step 4 (chat style): pressing CTA hides overlay so user can pick a style
    if (step === 4 && !hasChosenChatStyle) {
      setWaitingForChatChoice(true);
      setActiveScreen("chat");
      if (!isAlreadyOnRoute("/(tabs)/chat")) {
        try { router.replace("/(tabs)/chat" as never); } catch {}
      }
      return;
    }

    if (step >= stepsWithLast.length - 1) {
      completeWalkthrough();
      setActiveScreen(null);
      setTimeout(() => {
        try {
          // All users → drop straight into the first lesson.
          // After finishing mod-0-1, the lesson's "continue" button
          // will return them to the main learning map.
          router.replace({ pathname: "/lesson/[id]", params: { id: "mod-0-1", chapterId: "chapter-0" } } as never);
        } catch {
          // Fallback: go to safe home tab
          try { router.replace("/(tabs)" as never); } catch {}
        }
      }, 200);
      return;
    }

    const nextConfig = stepsWithLast[step + 1];
    // First update the step (instant), then navigate if needed
    setStep(step + 1);
    setContentKey((k) => k + 1);
    setActiveScreen(nextConfig.screenSignal);

    if (nextConfig.navigateTo) {
      // Always navigate, even if already on the route, to ensure the screen is visible
      setTransitioning(true);
      setTimeout(() => {
        try {
          router.replace(nextConfig.navigateTo as never);
        } catch {
          try { router.replace("/(tabs)" as never); } catch {}
        }
        setTimeout(() => setTransitioning(false), 300);
      }, 50);
    }
  }, [step, setStep, completeWalkthrough, setActiveScreen, router, transitioning, isAlreadyOnRoute, hasChosenChatStyle]);

  const handleBack = useCallback(() => {
    if (transitioning || step <= 0) return;
    tapHaptic();

    const prevConfig = stepsWithLast[step - 1];
    setStep(step - 1);
    setContentKey((k) => k + 1);
    setActiveScreen(prevConfig.screenSignal);
    // No navigation on back, the overlay covers the screen anyway
  }, [step, setStep, setActiveScreen, transitioning]);

  const handleSkip = useCallback(() => {
    tapHaptic();
    completeWalkthrough();
  }, [completeWalkthrough]);

  if (hasSeenWalkthrough || step < 0 || !stepConfig || !ready) return null;

  // Fully unmount while user picks chat style — visible={false} on iOS
  // can still intercept touches and block the ChatStylePicker below.
  if (waitingForChatChoice && !hasChosenChatStyle) return null;

  const enterAnim = reducedMotion ? undefined : FadeIn.duration(280);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent accessibilityViewIsModal onRequestClose={handleSkip}>
      <View style={s.overlay}>
        {/* ── Top: Step title pill with counter ── */}
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingTop: 36 }}>
          <Animated.View
            key={`pill-${contentKey}`}
            entering={reducedMotion ? undefined : FadeInDown.duration(350)}
            style={s.titlePill}
          >
            {stepConfig.emoji ? <Text style={s.titleEmoji}>{stepConfig.emoji}</Text> : null}
            <Text style={s.titleText} accessibilityRole="header">{stepConfig.title}</Text>
            <View style={s.stepCounter}>
              <Text style={s.stepCounterText}>{`${step + 1}/${stepsWithLast.length}`}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>

        {/* ── Middle: transparent, real screen shows through ── */}
        <View style={{ flex: 1 }} />

        {/* ── Bottom: Finn card + CTA ── */}
        <SafeAreaView edges={["bottom"]} style={{ paddingHorizontal: 16 }}>
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(500)} style={s.card}>
            {/* Glow border */}
            <View style={s.glowBorder} />

            {/* Finn avatar, floats above card with pulsing glow */}
            <View style={s.finnWrap}>
              <FinnPulse />
              <ExpoImage
                source={FINN_HELLO}
                style={s.finn}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Message, re-animates on step change */}
            <Animated.Text
              key={`msg-${contentKey}`}
              entering={enterAnim}
              style={s.message}
            >
              {stepConfig.message}
            </Animated.Text>

            {/* Dots, smaller for 7 steps */}
            <View style={s.dotsRow} accessibilityLabel={`שלב ${step + 1} מתוך ${stepsWithLast.length}`} accessibilityRole="text">
              {stepsWithLast.map((_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive]} />
              ))}
            </View>

            {/* Navigation row, back (right) + next (left) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
              {step > 0 ? (
                <Pressable
                  onPress={handleBack}
                  disabled={transitioning}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: "#ffffff",
                    borderWidth: 2,
                    borderColor: "#38bdf8",
                    borderBottomWidth: 4,
                    borderBottomColor: "#0ea5e9",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#0ea5e9",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                    opacity: transitioning ? 0.4 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="חזרה לשלב הקודם"
                >
                  <ChevronRight size={24} color="#0ea5e9" />
                </Pressable>
              ) : (
                <View style={{ width: 52 }} />
              )}
              <Pressable
                onPress={handleNext}
                disabled={transitioning}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: "#38bdf8",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row-reverse",
                  gap: 6,
                  borderBottomWidth: 4,
                  borderBottomColor: "#0ea5e9",
                  shadowColor: "#38bdf8",
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 6,
                  opacity: transitioning ? 0.5 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel={`${stepConfig.ctaLabel}, שלב ${step + 1} מתוך ${stepsWithLast.length}`}
                accessibilityState={{ disabled: transitioning }}
              >
                <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>{stepConfig.ctaLabel}</Text>
                <ChevronLeft size={20} color="#ffffff" />
              </Pressable>
            </View>

            {/* Skip */}
            <Pressable
              onPress={handleSkip}
              style={s.skipBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="דלג על הסיור"
            >
              <Text style={s.skipText}>דלג על הסיור</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles, Stitch premium UX with glow
// ---------------------------------------------------------------------------

const CARD_RADIUS = 28;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 22, 40, 0.18)",
  },

  /* ── Title pill ── */
  titlePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  titleEmoji: {
    fontSize: 22,
  },
  titleText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0c4a6e",
    writingDirection: "rtl",
  },
  stepCounter: {
    backgroundColor: "#e0f2fe",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginStart: 4,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284c7",
  },

  /* ── Bottom card, light blue theme ── */
  card: {
    backgroundColor: "#e0f2fe",
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 20,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
    overflow: "visible",
  },
  glowBorder: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: CARD_RADIUS + 1,
    borderWidth: 1.5,
    borderColor: "rgba(14, 165, 233, 0.35)",
  },

  /* ── Finn ── */
  finnWrap: {
    position: "absolute",
    top: -36,
    alignItems: "center",
    justifyContent: "center",
  },
  finnGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(56, 189, 248, 0.25)",
  },
  finn: {
    width: 68,
    height: 68,
  },

  /* ── Message ── */
  message: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0c4a6e",
    lineHeight: 24,
    writingDirection: "rtl",
    textAlign: "center",
    marginBottom: 16,
  },

  /* ── Dots ── */
  dotsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 5,
    marginBottom: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#bae6fd",
  },
  dotActive: {
    backgroundColor: "#38bdf8",
    width: 18,
    borderRadius: 3,
  },

  /* ── Skip ── */
  skipBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    writingDirection: "rtl",
  },
});