// ---------------------------------------------------------------------------
// First-time onboarding overlay for TradingHubScreen
// Shows step-by-step explanation of each UI component
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { tapHaptic } from "../../utils/haptics";
import { useTutorialStore } from "../../stores/useTutorialStore";

// ---------------------------------------------------------------------------
// Tutorial step definitions
// ---------------------------------------------------------------------------

interface TutorialStep {
  id: string;
  title: string;
  body: string;
  emoji: string;
}

const STEPS: TutorialStep[] = [
  {
    id: "carousel",
    title: "בחר נכס למסחר",
    body: "החלק בין המניות, המדדים והמטבעות. לחץ על נכס לבחירה, ולחץ שוב לפרטים נוספים.",
    emoji: "📊",
  },
  {
    id: "chart",
    title: "עקוב אחרי המחיר",
    body: "הגרף מציג את תנועת המחיר. החלף בין טווחי זמן, יום או שבוע, כדי לזהות מגמות.",
    emoji: "📈",
  },
  {
    id: "buy",
    title: "קנה מניות",
    body: 'לחץ על "קנה" כדי לפתוח פקודת רכישה. השתמש במטבעות המשחק, ללא סיכון אמיתי!',
    emoji: "💰",
  },
  {
    id: "holdings",
    title: "ניהול אחזקות",
    body: "כאן תמצא את כל ההשקעות שלך, רווח, הפסד ואפשרות למכור.",
    emoji: "💼",
  },
  {
    id: "learn",
    title: "למדו לפני שאתם סוחרים",
    body: "היחידות הזהב שלמטה ילמדו אותך את הבסיס, שוק ההון, ETF, פקודות מסחר ופיזור.",
    emoji: "📖",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TradingHubTutorialProps {
  onComplete: () => void;
}

export function TradingHubTutorial({ onComplete }: TradingHubTutorialProps) {
  const [step, setStep] = useState(0);
  const completeTutorial = useTutorialStore((s) => s.completeTradingHubIntro);

  const handleNext = useCallback(() => {
    tapHaptic();
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      completeTutorial();
      onComplete();
    }
  }, [step, completeTutorial, onComplete]);

  const handleSkip = useCallback(() => {
    tapHaptic();
    completeTutorial();
    onComplete();
  }, [completeTutorial, onComplete]);

  const current = STEPS[step];

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      {/* Dark backdrop, tap to advance */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNext} />

      {/* Explanation card */}
      <Animated.View entering={SlideInUp.springify().damping(18)} style={styles.card}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.stepTitle}>{current.title}</Text>
        <Text style={styles.stepBody}>{current.body}</Text>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Buttons, RTL: next on right, skip on left */}
        <View style={styles.buttonsRow}>
          <AnimatedPressable onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>
              {step === STEPS.length - 1 ? "סיים" : "הבא"}
            </Text>
          </AnimatedPressable>
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>דלג</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  card: {
    backgroundColor: "#f0f9ff",
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(56,189,248,0.3)",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    maxWidth: 340,
    width: "100%",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#bae6fd",
  },
  dotActive: {
    backgroundColor: "#0891b2",
    width: 20,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  nextBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderBottomWidth: 3,
    borderBottomColor: "#0e7490",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});
