import { useState, useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { FINN_HELLO } from "../retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { chapter1Data } from "../chapter-1-content/chapter1Data";

const { width: SW } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

interface WalkthroughStep {
  title: string;
  emoji: string;
  message: string;
  navigateTo: string | null;
  ctaLabel: string;
  isLast?: boolean;
}

const STEPS: WalkthroughStep[] = [
  {
    title: "היי! אני קפטן שארק",
    emoji: "🦈",
    message: "אני אלווה אותך לאורך כל הדרך.\nבוא נעשה סיור קצר באפליקציה!",
    navigateTo: null,
    ctaLabel: "יאללה, קדימה!",
  },
  {
    title: "מסלול הלמידה",
    emoji: "📚",
    message: "כאן מסלול הלמידה שלך — שיעורים, חידונים וסימולציות שיהפכו אותך למומחה פיננסי.",
    navigateTo: "/(tabs)/learn",
    ctaLabel: "עכשיו לפיד",
  },
  {
    title: "הפיד היומי",
    emoji: "🎯",
    message: "כאן תמצא משחקים יומיים, דילמות כלכליות, מיתוסים ותוכן שמתעדכן כל יום.",
    navigateTo: "/(tabs)/investments",
    ctaLabel: "לעולם ההשקעות",
  },
  {
    title: "עולם ההשקעות",
    emoji: "📈",
    message: "כאן תנהל תיק השקעות וירטואלי — קנה ומכור נכסים כמו בשוק אמיתי, בלי סיכון.",
    navigateTo: "/bridge",
    ctaLabel: "ומה עם הגשר?",
  },
  {
    title: "הגשר",
    emoji: "🌉",
    message: "הידע שלך שווה כסף אמיתי! בגשר תמיר את המטבעות שצברת להטבות ומוצרים פיננסיים בעולם האמיתי.",
    navigateTo: null,
    ctaLabel: "בוא נתחיל ללמוד! 🚀",
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

export function AppWalkthroughOverlay() {
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const step = useTutorialStore((s) => s.appWalkthroughStep);
  const setStep = useTutorialStore((s) => s.setAppWalkthroughStep);
  const completeWalkthrough = useTutorialStore((s) => s.completeAppWalkthrough);
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  const stepConfig = step >= 0 && step < STEPS.length ? STEPS[step] : null;

  const handleNext = useCallback(() => {
    if (transitioning) return;
    tapHaptic();

    if (step >= STEPS.length - 1) {
      completeWalkthrough();
      // The walkthrough itself counts as completing mod-0-1 (intro to money).
      // Mark it done so the user jumps straight to mod-0-2 instead of redoing it.
      try {
        const chapterStore = useChapterStore.getState();
        const completed0 = chapterStore.progress['ch-0']?.completedModules ?? [];
        if (!completed0.includes('mod-0-1')) {
          chapterStore.completeModule('mod-0-1');
        }
      } catch {}
      setTimeout(() => {
        // Find the first incomplete module so the user lands on the next lesson.
        try {
          const progress = useChapterStore.getState().progress;
          const chapters = [
            { data: chapter0Data, key: 'ch-0', routeId: 'chapter-0' },
            { data: chapter1Data, key: 'ch-1', routeId: 'chapter-1' },
          ];
          let target = { moduleId: 'mod-0-2', chapterId: 'chapter-0' };
          for (const ch of chapters) {
            const completed = progress[ch.key]?.completedModules ?? [];
            const next = ch.data.modules.find((m) => !completed.includes(m.id));
            if (next) { target = { moduleId: next.id, chapterId: ch.routeId }; break; }
          }
          router.push(`/lesson/${target.moduleId}?chapterId=${target.chapterId}` as never);
        } catch {}
      }, 200);
      return;
    }

    const nextNav = STEPS[step].navigateTo;
    if (nextNav) {
      setTransitioning(true);
      setTimeout(() => {
        try { router.replace(nextNav as never); } catch {}
        setTimeout(() => {
          setStep(step + 1);
          setTransitioning(false);
        }, 400);
      }, 100);
    } else {
      setStep(step + 1);
    }
  }, [step, setStep, completeWalkthrough, router, transitioning]);

  const handleSkip = useCallback(() => {
    tapHaptic();
    completeWalkthrough();
  }, [completeWalkthrough]);

  if (hasSeenWalkthrough || step < 0 || !stepConfig) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent accessibilityViewIsModal>
      <View style={s.overlay}>
        {/* ── Top: Step title pill ── */}
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingTop: 12 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={s.titlePill}>
            <Text style={s.titleEmoji}>{stepConfig.emoji}</Text>
            <Text style={s.titleText} accessibilityRole="header">{stepConfig.title}</Text>
          </Animated.View>
        </SafeAreaView>

        {/* ── Middle: transparent — real screen shows through ── */}
        <View style={{ flex: 1 }} />

        {/* ── Bottom: Finn card + CTA ── */}
        <SafeAreaView edges={["bottom"]} style={{ paddingHorizontal: 16 }}>
          <Animated.View entering={FadeInUp.duration(500)} style={s.card}>
            {/* Glow border */}
            <View style={s.glowBorder} />

            {/* Finn avatar — floats above card */}
            <View style={s.finnWrap}>
              <View style={s.finnGlow} />
              <ExpoImage
                source={FINN_HELLO}
                style={s.finn}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Message */}
            <Text style={s.message}>{stepConfig.message}</Text>

            {/* Dots */}
            <View style={s.dotsRow} accessibilityLabel={`שלב ${step + 1} מתוך ${STEPS.length}`} accessibilityRole="text">
              {STEPS.map((_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive]} />
              ))}
            </View>

            {/* CTA — big blue glow button */}
            <Pressable
              onPress={handleNext}
              disabled={transitioning}
              style={({ pressed }) => [s.ctaBtn, pressed && { transform: [{ scale: 0.97 }] }, transitioning && { opacity: 0.5 }]}
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
                <View style={{ width: 32, height: 32, overflow: "hidden" }} accessible={false}>
                  <LottieView
                    source={require("../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json")}
                    style={{ width: 32, height: 32 }}
                    autoPlay
                    loop
                  />
                </View>
              </LinearGradient>
            </Pressable>

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
    backgroundColor: "rgba(10, 22, 40, 0.45)",
  },

  /* ── Title pill ── */
  titlePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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

  /* ── Bottom card ── */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 20,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
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
    borderColor: "rgba(14, 165, 233, 0.3)",
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
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  finn: {
    width: 68,
    height: 68,
  },

  /* ── Message ── */
  message: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 24,
    writingDirection: "rtl",
    textAlign: "center",
    marginBottom: 16,
  },

  /* ── Dots ── */
  dotsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  dotActive: {
    backgroundColor: "#0ea5e9",
    width: 22,
    borderRadius: 4,
  },

  /* ── CTA �� glow button ── */
  ctaBtn: {
    width: "100%",
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  ctaGradient: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 28,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  ctaText: {
    fontSize: 22,
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
    color: "#64748b",
  },
});