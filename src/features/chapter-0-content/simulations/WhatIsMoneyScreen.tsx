import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, ZoomIn, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import LottieView from "lottie-react-native";
import { ChevronRight, ChevronLeft } from "lucide-react-native";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { successHaptic, mediumHaptic } from "../../../utils/haptics";

const STORY_STEPS = [
  {
    title: "פעם עשינו סחר חליפין",
    subtitle: "פרה תמורת חיטה. אבל מה קורה אם הצד השני לא צריך פרה?",
    lottie: require("../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json"),
  },
  {
    title: "ואז המצאנו מטבעות",
    subtitle: "משהו מוסכם שקל לקחת בכיס וכולם רוצים.",
    lottie: require("../../../../assets/lottie/wired-flat-298-coins-hover-jump.json"),
  },
  {
    title: "היום הכל דיגיטלי",
    subtitle: "כסף הוא בסך הכל הסכמה חברתית, מספרים על מסך או אפליקציה.",
    lottie: require("../../../../assets/lottie/wired-flat-721-hand-with-phone-hover-scroll.json"),
  },
];

export function WhatIsMoneyScreen({ onComplete }: { onComplete: (score: number) => void }) {
  const [step, setStep] = useState(0);

  const handleNext = useCallback(() => {
    mediumHaptic();
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      successHaptic();
      onComplete(100);
    }
  }, [step, onComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      mediumHaptic();
      setStep((s) => s - 1);
    }
  }, [step]);

  // Swipe left → next, swipe right → previous
  const swipeLeft = Gesture.Fling()
    .direction(1)
    .onEnd(() => { runOnJS(handleNext)(); });

  const swipeRight = Gesture.Fling()
    .direction(2)
    .onEnd(() => { runOnJS(handlePrev)(); });

  const swipeGesture = Gesture.Race(swipeLeft, swipeRight);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
          <Text style={styles.header} accessibilityRole="header">התפתחות הכסף</Text>

          <View style={styles.lottieBox} accessible={false}>
            <LottieView
              key={step}
              source={STORY_STEPS[step].lottie}
              style={{ width: 180, height: 180 }}
              autoPlay
              loop
            />
          </View>

          <Animated.View entering={ZoomIn.duration(300).delay(200)} key={`text-${step}`} style={styles.textBox}>
            <Text style={styles.title}>{STORY_STEPS[step].title}</Text>
            <Text style={styles.subtitle}>{STORY_STEPS[step].subtitle}</Text>
          </Animated.View>

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {STORY_STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
        </Animated.View>

        {/* Bottom nav — matches LessonFlowScreen card pattern */}
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AnimatedPressable
              onPress={handlePrev}
              disabled={step === 0}
              style={{ padding: 8, opacity: step === 0 ? 0.3 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="הקודם"
              accessibilityHint="חוזר לשלב הקודם"
            >
              <ChevronRight size={28} color="#3b82f6" />
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleNext}
              style={styles.navContinueBtn}
              accessibilityRole="button"
              accessibilityLabel={step === 2 ? "הבנתי" : "המשך"}
              accessibilityHint={step === 2 ? "סיום הסימולציה ומעבר הלאה" : "ממשיך לשלב הבא"}
            >
              <Text style={styles.navContinueText}>{step === 2 ? "הבנתי!" : "המשך"}</Text>
              <ChevronLeft size={18} color="#fff" />
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbeafe",
    padding: 24,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1d4ed8",
    marginBottom: 40,
  },
  lottieBox: {
    width: 240,
    height: 240,
    backgroundColor: "#ffffff",
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    marginBottom: 40,
  },
  textBox: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(29,78,216,0.2)",
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1d4ed8",
  },
  navContinueBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: "#1d4ed8",
  },
  navContinueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
