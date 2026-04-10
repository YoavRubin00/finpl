import { useState, useCallback, useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
import LottieView from "lottie-react-native";
import { ChevronRight } from "lucide-react-native";
import { useTutorialStore } from "../../stores/useTutorialStore";
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
  isLast?: boolean;
}

const STEPS: WalkthroughStep[] = [
  {
    title: "היי! אני קפטן שארק",
    emoji: "🦈",
    message: "אני אלווה אותך לאורך כל הדרך.\nבוא נעשה סיור קצר באפליקציה!",
    navigateTo: null,
    ctaLabel: "יאללה, קדימה!",
    screenSignal: null,
  },
  {
    title: "מסלול הלמידה",
    emoji: "📚",
    message: "כאן מסלול הלמידה שלך — שיעורים, חידונים וסימולציות שיהפכו אותך למומחה פיננסי.",
    navigateTo: "/(tabs)",
    ctaLabel: "מה נלמד באפליקציה?",
    screenSignal: "learn",
  },
  {
    title: "מה נלמד באפליקציה?",
    emoji: "🎓",
    message: "6 פרקים, מאפס ועד מומחה — כל מה שצריך כדי להבין את עולם הכסף. גלול למטה ותראה!",
    navigateTo: "/(tabs)",
    ctaLabel: "עכשיו לפיד",
    screenSignal: "learn",
  },
  {
    title: "הפיד היומי",
    emoji: "🎯",
    message: "כאן תמצא משחקים יומיים, דילמות כלכליות, מיתוסים ותוכן שמתעדכן כל יום.",
    navigateTo: "/(tabs)/learn",
    ctaLabel: "תבחרו איך ידברו איתכם",
    screenSignal: "feed",
  },
  {
    title: "תבחרו סגנון לשארק",
    emoji: "🦈",
    message: "לפני שנמשיך — תבחרו איך תרצו ששארק ידבר איתכם! חכם? ישיר? חם? אנליטי?",
    navigateTo: "/(tabs)/chat",
    ctaLabel: "בחרתי!",
    screenSignal: "chat",
  },
  {
    title: "הצ'אט של שארק",
    emoji: "💬",
    message: "כאן תוכלו לדבר על כל מה שקשור לכסף — שארק תמיד פה לשאלות, הסברים וייעוץ אישי.",
    navigateTo: null,
    ctaLabel: "לחנות",
    screenSignal: "chat",
  },
  {
    title: "החנות",
    emoji: "🏪",
    message: "כאן תוכל להשתמש במטבעות הזהב שצברת — אייטמים, בוסטרים ועוד. מרוויחים זהב דרך למידה!",
    navigateTo: "/(tabs)/shop",
    ctaLabel: "ומה עם הגשר?",
    screenSignal: "shop",
  },
  {
    title: "הגשר",
    emoji: "🌉",
    message: "הידע שלך שווה כסף אמיתי! בגשר תמיר את המטבעות שצברת להטבות ומוצרים פיננסיים בעולם האמיתי.",
    navigateTo: "/bridge",
    ctaLabel: "בוא נתחיל ללמוד!",
    screenSignal: "bridge",
    isLast: true,
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
  const [transitioning, setTransitioning] = useState(false);
  const reducedMotion = useReducedMotion();
  // Key to force re-mount of content for enter/exit animation between steps
  const [contentKey, setContentKey] = useState(0);

  const stepConfig = step >= 0 && step < STEPS.length ? STEPS[step] : null;

  const setActiveScreen = useTutorialStore((s) => s.setWalkthroughActiveScreen);

  const handleNext = useCallback(() => {
    if (transitioning) return;
    tapHaptic();

    if (step >= STEPS.length - 1) {
      completeWalkthrough();
      setActiveScreen(null);
      // Navigate to the general learning screen so the user sees the full path
      setTimeout(() => {
        try {
          router.push("/(tabs)" as never);
        } catch {}
      }, 200);
      return;
    }

    const nextConfig = STEPS[step + 1];
    if (nextConfig.navigateTo) {
      setTransitioning(true);
      setTimeout(() => {
        try { router.replace(nextConfig.navigateTo as never); } catch {}
        setTimeout(() => {
          setStep(step + 1);
          setContentKey((k) => k + 1);
          setActiveScreen(nextConfig.screenSignal);
          setTransitioning(false);
        }, 400);
      }, 100);
    } else {
      setStep(step + 1);
      setContentKey((k) => k + 1);
      setActiveScreen(nextConfig.screenSignal);
    }
  }, [step, setStep, completeWalkthrough, setActiveScreen, router, transitioning]);

  const handleBack = useCallback(() => {
    if (transitioning || step <= 0) return;
    tapHaptic();

    const prevConfig = STEPS[step - 1];
    if (prevConfig.navigateTo) {
      setTransitioning(true);
      setTimeout(() => {
        try { router.replace(prevConfig.navigateTo as never); } catch {}
        setTimeout(() => {
          setStep(step - 1);
          setContentKey((k) => k + 1);
          setActiveScreen(prevConfig.screenSignal);
          setTransitioning(false);
        }, 400);
      }, 100);
    } else {
      setStep(step - 1);
      setContentKey((k) => k + 1);
      setActiveScreen(prevConfig.screenSignal);
    }
  }, [step, setStep, setActiveScreen, router, transitioning]);

  const handleSkip = useCallback(() => {
    tapHaptic();
    completeWalkthrough();
  }, [completeWalkthrough]);

  if (hasSeenWalkthrough || step < 0 || !stepConfig) return null;

  const enterAnim = reducedMotion ? undefined : FadeIn.duration(280);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent accessibilityViewIsModal>
      <View style={s.overlay}>
        {/* ── Top: Step title pill with counter ── */}
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingTop: 12 }}>
          <Animated.View
            key={`pill-${contentKey}`}
            entering={reducedMotion ? undefined : FadeInDown.duration(350)}
            style={s.titlePill}
          >
            <Text style={s.titleEmoji}>{stepConfig.emoji}</Text>
            <Text style={s.titleText} accessibilityRole="header">{stepConfig.title}</Text>
            <View style={s.stepCounter}>
              <Text style={s.stepCounterText}>{`${step + 1}/${STEPS.length}`}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>

        {/* ── Middle: transparent — real screen shows through ── */}
        <View style={{ flex: 1 }} />

        {/* ── Bottom: Finn card + CTA ── */}
        <SafeAreaView edges={["bottom"]} style={{ paddingHorizontal: 16 }}>
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(500)} style={s.card}>
            {/* Glow border */}
            <View style={s.glowBorder} />

            {/* Finn avatar — floats above card with pulsing glow */}
            <View style={s.finnWrap}>
              <FinnPulse />
              <ExpoImage
                source={FINN_HELLO}
                style={s.finn}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Message — re-animates on step change */}
            <Animated.Text
              key={`msg-${contentKey}`}
              entering={enterAnim}
              style={s.message}
            >
              {stepConfig.message}
            </Animated.Text>

            {/* Dots — smaller for 7 steps */}
            <View style={s.dotsRow} accessibilityLabel={`שלב ${step + 1} מתוך ${STEPS.length}`} accessibilityRole="text">
              {STEPS.map((_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive]} />
              ))}
            </View>

            {/* CTA row — back arrow (right in RTL) + big blue glow button */}
            <View style={s.ctaRow}>
              {step > 0 && (
                <Pressable
                  onPress={handleBack}
                  disabled={transitioning}
                  style={({ pressed }) => [s.backBtn, pressed && { transform: [{ scale: 0.93 }] }, transitioning && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel="חזרה לשלב הקודם"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <ChevronRight size={22} color="#7dd3fc" />
                </Pressable>
              )}
              <Pressable
                onPress={handleNext}
                disabled={transitioning}
                style={({ pressed }) => [s.ctaBtn, { flex: 1 }, pressed && { transform: [{ scale: 0.97 }] }, transitioning && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={`${stepConfig.ctaLabel}, שלב ${step + 1} מתוך ${STEPS.length}`}
                accessibilityState={{ disabled: transitioning }}
              >
                <LinearGradient
                  colors={["#0ea5e9", "#38bdf8", "#0ea5e9"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.ctaGradient}
                >
                  <Text style={s.ctaText}>{stepConfig.ctaLabel}</Text>
                  {!reducedMotion && (
                    <View style={{ width: 32, height: 32, overflow: "hidden" }} accessible={false}>
                      <LottieView
                        source={require("../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json")}
                        style={{ width: 32, height: 32 }}
                        autoPlay
                        loop
                      />
                    </View>
                  )}
                </LinearGradient>
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
// Styles — Stitch premium UX with glow
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

  /* ── Bottom card — blue theme ── */
  card: {
    backgroundColor: "#0c4a6e",
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 20,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
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
    borderColor: "rgba(56, 189, 248, 0.5)",
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
    backgroundColor: "rgba(56, 189, 248, 0.35)",
  },
  finn: {
    width: 68,
    height: 68,
  },

  /* ── Message ── */
  message: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e0f2fe",
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
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "#38bdf8",
    width: 18,
    borderRadius: 3,
  },

  /* ── CTA row (RTL) ── */
  ctaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },

  /* ── Back button — blue card ── */
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(56,189,248,0.4)",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(56,189,248,0.3)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#38bdf8",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  /* ── CTA — uniform glow button ── */
  ctaBtn: {
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#38bdf8",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaGradient: {
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.3,
  },

  /* ── Skip ── */
  skipBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    writingDirection: "rtl",
  },
});