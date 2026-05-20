import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ShieldCheck, EyeOff, Lock } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { STITCH } from "../../../constants/theme";
import { tapHaptic } from "../../../utils/haptics";
import { usePayslipMetaStore } from "../../payslip-analyzer/usePayslipMetaStore";

/**
 * Mock peer benchmarks. In a future iteration these come from a real
 * aggregated server endpoint. Values reflect realistic Israeli payslips.
 */
const PEER_BENCHMARKS = {
  bruttoMedian: 14_500,
  pensionPctMedian: 6.5,
  creditPointsMedian: 2.5,
};

function PercentileBar({
  label,
  yourLabel,
  groupLabel,
  yourMarkerPosition,
  unit,
  accentColor,
}: {
  label: string;
  yourLabel: string;
  groupLabel: string;
  /** Position 0..1 along the bar. */
  yourMarkerPosition: number;
  unit: string;
  accentColor: string;
}) {
  const pct = Math.max(0.04, Math.min(0.96, yourMarkerPosition));
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRow}>
        <View style={styles.statBarTrack}>
          <View
            style={[
              styles.statBarMedianLine,
              { left: "50%", backgroundColor: "#94a3b8" },
            ]}
          />
          <View
            style={[
              styles.statBarMarker,
              { left: `${pct * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
      </View>
      <View style={styles.statLegendRow}>
        <Text style={styles.statLegendGroup}>חציון בקבוצה: {groupLabel}{unit}</Text>
        <View style={styles.youChip}>
          <Text style={[styles.youChipText, { color: accentColor }]}>אתה</Text>
          <Text style={[styles.youChipValue, { color: accentColor }]}>
            {yourLabel}{unit}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function AnonymousPayslipCard(): React.ReactElement {
  const router = useRouter();
  const stats = usePayslipMetaStore((s) => s.lastAnonymizedStats);
  const clearStats = usePayslipMetaStore((s) => s.clearAnonymizedStats);
  const everUsed = usePayslipMetaStore((s) => s.everUsed);

  const handleAnalyze = () => {
    tapHaptic();
    router.push("/payslip-analyzer" as never);
  };

  const handleOptOut = () => {
    tapHaptic();
    clearStats();
  };

  // ── State A: never analyzed a payslip yet ──
  if (!everUsed) {
    return (
      <Animated.View entering={FadeInDown.duration(360)} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <ShieldCheck size={20} color="#0891b2" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>תלוש שכר אנונימי בקבוצה</Text>
            <Text style={styles.headerSubtitle}>
              נתחו תלוש פעם אחת — ותראו איך אתם מתפלגים מול הקהילה.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleAnalyze}
          style={styles.ctaPrimary}
          accessibilityRole="button"
          accessibilityLabel="התחילו עם ניתוח תלוש"
        >
          <Text style={styles.ctaPrimaryText}>נתחו תלוש כדי להתחיל</Text>
        </Pressable>
        <PrivacyFooter />
      </Animated.View>
    );
  }

  // ── State B: analyzed but not opted in ──
  if (!stats) {
    return (
      <Animated.View entering={FadeInDown.duration(360)} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <ShieldCheck size={20} color="#0891b2" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>תרצו לראות איך אתם מתפלגים?</Text>
            <Text style={styles.headerSubtitle}>
              שתפו את הניתוח האחרון אנונימית עם הקהילה וקבלו מבט השוואתי.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleAnalyze}
          style={styles.ctaPrimary}
          accessibilityRole="button"
          accessibilityLabel="פתחו את ניתוח התלוש כדי לשתף אנונימית"
        >
          <Text style={styles.ctaPrimaryText}>שתפו אנונימית מהניתוח האחרון</Text>
        </Pressable>
        <PrivacyFooter />
      </Animated.View>
    );
  }

  // ── State C: opted in — show 3 mini-charts ──
  const bruttoMidPoint = parseBruttoMidpoint(stats.bruttoRangeIls);
  const bruttoPosition =
    bruttoMidPoint !== null
      ? Math.min(1, bruttoMidPoint / (PEER_BENCHMARKS.bruttoMedian * 2))
      : 0.5;

  const pensionPosition =
    stats.pensionEmployeePct !== null
      ? Math.min(1, stats.pensionEmployeePct / (PEER_BENCHMARKS.pensionPctMedian * 2))
      : 0.5;

  const creditPosition =
    stats.creditPoints !== null
      ? Math.min(1, stats.creditPoints / (PEER_BENCHMARKS.creditPointsMedian * 2))
      : 0.5;

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <ShieldCheck size={20} color="#0891b2" strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>תלוש שכר אנונימי בקבוצה</Text>
          <Text style={styles.headerSubtitle}>
            ההשוואה שלכם מול הקהילה — ערכים בטווחים בלבד
          </Text>
        </View>
      </View>

      <Animated.View entering={FadeIn.duration(380)} style={styles.statsBlock}>
        <PercentileBar
          label="השכר שלכם בקבוצה"
          yourLabel={stats.bruttoRangeIls || "—"}
          groupLabel={PEER_BENCHMARKS.bruttoMedian.toLocaleString("he-IL")}
          yourMarkerPosition={bruttoPosition}
          unit=" ₪"
          accentColor="#0891b2"
        />
        <PercentileBar
          label="% פנסיה בקבוצה"
          yourLabel={
            stats.pensionEmployeePct !== null ? `${stats.pensionEmployeePct}` : "—"
          }
          groupLabel={`${PEER_BENCHMARKS.pensionPctMedian}`}
          yourMarkerPosition={pensionPosition}
          unit="%"
          accentColor="#10b981"
        />
        <PercentileBar
          label="נקודות זיכוי בקבוצה"
          yourLabel={
            stats.creditPoints !== null ? `${stats.creditPoints}` : "—"
          }
          groupLabel={`${PEER_BENCHMARKS.creditPointsMedian}`}
          yourMarkerPosition={creditPosition}
          unit=""
          accentColor="#7c3aed"
        />
      </Animated.View>

      <Pressable
        onPress={handleOptOut}
        style={styles.ctaSecondary}
        accessibilityRole="button"
        accessibilityLabel="הסירו את הנתונים האנונימיים מהשיתוף"
      >
        <Text style={styles.ctaSecondaryText}>הסירו את השיתוף</Text>
      </Pressable>
      <PrivacyFooter />
    </Animated.View>
  );
}

function PrivacyFooter() {
  return (
    <View style={styles.privacyFooter}>
      <Lock size={11} color="#64748b" strokeWidth={2.4} />
      <Text style={styles.privacyFooterText}>
        רק טווחים יוצאים החוצה. אין מספרים מדויקים, אין שמות.
      </Text>
      <EyeOff size={11} color="#64748b" strokeWidth={2.4} />
    </View>
  );
}

function parseBruttoMidpoint(range: string): number | null {
  if (!range) return null;
  const match = range.match(/^(\d[\d,]*)\s*[–-]\s*(\d[\d,]*)/);
  if (!match) return null;
  const lower = parseInt(match[1].replace(/,/g, ""), 10);
  const upper = parseInt(match[2].replace(/,/g, ""), 10);
  if (Number.isNaN(lower) || Number.isNaN(upper)) return null;
  return (lower + upper) / 2;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cffafe",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 2,
    lineHeight: 16,
  },
  ctaPrimary: {
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaPrimaryText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
    writingDirection: "rtl",
  },
  ctaSecondary: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaSecondaryText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 12,
    writingDirection: "rtl",
  },
  statsBlock: {
    gap: 14,
  },
  statBlock: {
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
  },
  statRow: {
    height: 14,
    justifyContent: "center",
  },
  statBarTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    position: "relative",
  },
  statBarMedianLine: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  statBarMarker: {
    position: "absolute",
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    transform: [{ translateX: -7 }],
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  statLegendRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statLegendGroup: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    writingDirection: "rtl",
  },
  youChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
  },
  youChipText: {
    fontSize: 10,
    fontWeight: "900",
    writingDirection: "rtl",
  },
  youChipValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  privacyFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: STITCH.surfaceHighest,
  },
  privacyFooterText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    writingDirection: "rtl",
    textAlign: "center",
  },
});
