import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChevronRight, ChevronLeft } from "lucide-react-native";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { successHaptic, mediumHaptic } from "../../../utils/haptics";

export function InvestVsSaveScreen({ onComplete }: { onComplete: (score: number) => void }) {
  const [yearsPassed, setYearsPassed] = useState(0);
  const [savings, setSavings] = useState(1000);
  const [investment, setInvestment] = useState(1000);
  const [isFinished, setIsFinished] = useState(false);

  const handleNextYear = () => {
    mediumHaptic();
    if (yearsPassed < 10) {
      setYearsPassed(y => y + 1);
      // Savings loses 2% to inflation each year effectively in value, or stays same nominally? Let's show nominal value but buying power decreases. 
      // Nah, let's show an easy concept: Savings stays 1000. Investment grows 8% per year.
      setSavings(s => s + 50); // Very little interest
      setInvestment(i => Math.round(i * 1.08));
    } else {
      setIsFinished(true);
    }
  };

  const handleFinish = () => {
    successHaptic();
    onComplete(100);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header} accessibilityRole="header">המזרן מול העץ</Text>
      <Text style={styles.subtitle}>לשמור כסף מתחת למזרן מול לשתול אותו בעציץ.</Text>

      <View style={styles.statsCard} accessibilityLiveRegion="polite">
        <View style={styles.statRow}>
          <Text style={styles.statValue}>{yearsPassed}</Text>
          <Text style={styles.statLabel}>שנים עברו</Text>
        </View>
      </View>

      <View style={styles.comparisons}>
        <View style={styles.column}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🛏️</Text>
          </View>
          <Text style={styles.columnTitle}>מתחת למזרן</Text>
          <Text style={styles.columnValue} accessibilityLiveRegion="polite">₪{savings}</Text>
          <Text style={styles.columnDesc}>כמעט ולא צומח</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🌳</Text>
          </View>
          <Text style={styles.columnTitle}>השקעה חכמה</Text>
          <Text style={[styles.columnValue, { color: "#10b981" }]} accessibilityLiveRegion="polite">₪{investment}</Text>
          <Text style={styles.columnDesc}>ריבית דריבית עושה קסמים</Text>
        </View>
      </View>

      {isFinished ? (
        <Animated.View entering={FadeIn.duration(500)} style={styles.finishedBox}>
          <Text style={styles.finishedTitle}>הזמן עובד בשבילך</Text>
          <Text style={styles.finishedSubtitle}>
            כסף ששוכב מאבד מערכו. כסף שמושקע עובד קשה ומייצר עוד כסף בשבילך בזכות הריבית דריבית.
          </Text>
          <View style={styles.navBar}>
            <AnimatedPressable onPress={handleFinish} style={styles.navContinueBtn} accessibilityRole="button" accessibilityLabel="הבנתי">
              <Text style={styles.navContinueText}>הבנתי!</Text>
              <ChevronLeft size={18} color="#fff" />
            </AnimatedPressable>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.navBar}>
          <AnimatedPressable
            onPress={() => { if (yearsPassed > 0) { mediumHaptic(); setYearsPassed(y => y - 1); setSavings(s => s - 50); setInvestment(i => Math.round(i / 1.08)); } }}
            disabled={yearsPassed === 0}
            style={{ padding: 8, opacity: yearsPassed === 0 ? 0.3 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="שנה אחורה"
          >
            <ChevronRight size={28} color="#3b82f6" />
          </AnimatedPressable>
          <AnimatedPressable onPress={handleNextYear} style={styles.navContinueBtn} accessibilityRole="button" accessibilityLabel="עבור שנה קדימה">
            <Text style={styles.navContinueText}>עבור שנה קדימה</Text>
            <ChevronLeft size={18} color="#fff" />
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbeafe",
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1d4ed8",
    textAlign: "center",
    marginTop: 40,
  },
  subtitle: {
    fontSize: 15,
    color: "#1e3a8a",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    alignSelf: "center",
    width: "50%",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 20,
  },
  statRow: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1d4ed8",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  comparisons: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4b5563",
    marginBottom: 8,
  },
  columnValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#374151",
    marginBottom: 4,
  },
  columnDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  divider: {
    width: 2,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  finishedBox: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
  },
  finishedTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e3a8a",
    marginBottom: 8,
    textAlign: "center",
  },
  finishedSubtitle: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
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
