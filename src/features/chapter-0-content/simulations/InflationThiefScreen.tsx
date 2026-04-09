import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { successHaptic, mediumHaptic } from "../../../utils/haptics";

/** Realistic bread prices in Israel (₪25 in 2024, derived backwards at ~3.5% annual inflation) */
const TIMELINE: readonly { year: number; breadPrice: number; power: number }[] = [
  { year: 2000, breadPrice: 11,   power: 100 },
  { year: 2004, breadPrice: 12.5, power: 87 },
  { year: 2008, breadPrice: 14.5, power: 76 },
  { year: 2012, breadPrice: 16.5, power: 66 },
  { year: 2016, breadPrice: 19,   power: 57 },
  { year: 2020, breadPrice: 22,   power: 50 },
  { year: 2024, breadPrice: 25,   power: 44 },
];

export function InflationThiefScreen({ onComplete }: { onComplete: (score: number) => void }) {
  const [step, setStep] = useState(0);
  const current = TIMELINE[step];
  const isFinished = step === TIMELINE.length - 1;

  const handleNextYear = () => {
    mediumHaptic();
    setStep((s) => Math.min(s + 1, TIMELINE.length - 1));
  };

  const handleFinish = () => {
    successHaptic();
    onComplete(100);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Text style={styles.header} accessibilityRole="header">הגנב השקוף</Text>

      <Animated.View entering={FadeIn.duration(400)} style={styles.thiefContainer}>
        <View accessible={false}>
          <LottieView
            source={require("../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json")}
            style={{ width: 100, height: 100, opacity: 0.8 }}
            autoPlay
            loop
          />
        </View>
        <Text style={styles.thiefText}>אינפלציה שודדת את הערך של הכסף שלנו בשקט.</Text>
      </Animated.View>

      <View style={styles.statsCard} accessibilityLiveRegion="polite">
        <View style={styles.statRow}>
          <Text style={styles.statValue}>{current.year}</Text>
          <Text style={styles.statLabel}>שנה</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statValue}>₪{current.breadPrice}</Text>
          <Text style={styles.statLabel}>מחיר כיכר לחם</Text>
        </View>
      </View>

      {/* Purchasing Power Visualizer */}
      <View style={styles.powerContainer}>
        <Text style={styles.powerLabel}>כוח קנייה של שטר 100₪</Text>
        <View style={styles.powerBarBg}>
          <Animated.View style={[styles.powerBarFill, { width: `${current.power}%` }]} />
        </View>
        <Text style={styles.powerValue} accessibilityLiveRegion="polite">{current.power}%</Text>
      </View>

      {isFinished ? (
        <Animated.View entering={SlideInDown}>
          <AnimatedPressable onPress={handleFinish} style={styles.finishBtn} accessibilityRole="button" accessibilityLabel="הבנתי" accessibilityHint="סיום הסימולציה ומעבר הלאה">
            <Text style={styles.finishBtnText}>הבנתי!</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : (
        <AnimatedPressable onPress={handleNextYear} style={styles.nextYearBtn} accessibilityRole="button" accessibilityLabel="קפוץ 4 שנים קדימה" accessibilityHint="מציג את השפעת האינפלציה על מחיר הלחם">
          <Text style={styles.nextYearBtnText}>קפוץ 4 שנים קדימה</Text>
          <Text style={styles.btnIcon}>⏩</Text>
        </AnimatedPressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbeafe",
  },
  contentContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "space-between" as const,
  },
  header: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1d4ed8",
    textAlign: "center",
    marginTop: 20,
  },
  thiefContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  thiefText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginTop: 10,
    textAlign: "center",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 20,
  },
  statRow: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  divider: {
    width: 2,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  powerContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  powerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
    marginBottom: 12,
    textAlign: "right",
  },
  powerBarBg: {
    height: 24,
    backgroundColor: "#fce7f3",
    borderRadius: 12,
    overflow: "hidden",
  },
  powerBarFill: {
    height: "100%",
    backgroundColor: "#f43f5e",
    borderRadius: 12,
  },
  powerValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#be123c",
    marginTop: 8,
    textAlign: "right",
  },
  nextYearBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginBottom: 20,
  },
  nextYearBtnText: {
    color: "#1d4ed8",
    fontSize: 18,
    fontWeight: "900",
  },
  btnIcon: {
    fontSize: 18,
  },
  finishBtn: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
  },
  finishBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
});
