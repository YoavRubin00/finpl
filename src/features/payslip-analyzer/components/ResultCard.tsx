import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, TrendingUp, Wallet, Sparkles } from "lucide-react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { GlowCard } from "../../../components/ui/GlowCard";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { STITCH } from "../../../constants/theme";
import { AnomalyRow } from "./AnomalyRow";
import { LEGAL_DISCLAIMER_SHORT } from "../lib/legalDisclaimer";
import type {
  PayslipDeduction,
  PayslipMetric,
  PayslipMetricUnit,
  PayslipResult,
} from "../types";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = {
  writingDirection: "rtl" as const,
  textAlign: "center" as const,
};

interface CountingTextProps {
  value: number;
  duration?: number;
  startDelay?: number;
  style?: import("react-native").StyleProp<import("react-native").TextStyle>;
  suffix?: string;
}

function CountingText({
  value,
  duration = 1100,
  startDelay = 0,
  style,
  suffix,
}: CountingTextProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? value : 0);
  const [display, setDisplay] = useState<number>(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = value;
      setDisplay(value);
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      startDelay,
      withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [value, duration, startDelay, reduceMotion, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  const formatted = useMemo(() => {
    const safeValue = Number.isFinite(display) ? display : 0;
    return safeValue.toLocaleString("he-IL");
  }, [display]);

  return (
    <Text style={style} allowFontScaling={false}>
      {formatted}
      {suffix ? <Text style={style}>{` ${suffix}`}</Text> : null}
    </Text>
  );
}

function formatMetricValue(value: number, unit: PayslipMetricUnit): string {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toLocaleString("he-IL");
  switch (unit) {
    case "ILS":
      return `${formatted} ₪`;
    case "days":
      return `${formatted} ימים`;
    case "points":
      return `${formatted} נק׳`;
    case "hours":
      return `${formatted} ש׳`;
    case "count":
    default:
      return formatted;
  }
}

interface DeductionRowProps {
  deduction: PayslipDeduction;
  index: number;
}

function DeductionRow({ deduction, index }: DeductionRowProps) {
  const [showHint, setShowHint] = useState(false);

  const handlePress = useCallback(() => {
    setShowHint((prev) => !prev);
  }, []);

  const amountText = useMemo(
    () =>
      `${(Number.isFinite(deduction.amount) ? deduction.amount : 0).toLocaleString(
        "he-IL",
      )} ₪`,
    [deduction.amount],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(60 + index * 70).duration(260)}
      style={deductionStyles.row}
    >
      <AnimatedPressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${deduction.label}: ${amountText}`}
        accessibilityState={{ expanded: showHint }}
        style={deductionStyles.press}
        noScale
        noHaptic
      >
        <View style={deductionStyles.headRow}>
          <Text
            style={[deductionStyles.label, RTL]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {deduction.label}
          </Text>
          <Text
            style={[deductionStyles.amount, RTL]}
            allowFontScaling={false}
          >
            {amountText}
          </Text>
        </View>
        {showHint ? (
          <Animated.View entering={FadeIn.duration(180)}>
            <Text
              style={[deductionStyles.hint, RTL]}
              allowFontScaling={false}
            >
              לחיצה נוספת מסתירה את הפירוט.
            </Text>
          </Animated.View>
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

interface MetricChipProps {
  metric: PayslipMetric;
  index: number;
}

function MetricChip({ metric, index }: MetricChipProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(120 + index * 60).duration(260)}
      style={metricStyles.chip}
    >
      <Text
        style={[metricStyles.label, RTL]}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {metric.label}
      </Text>
      <Text
        style={[metricStyles.value, RTL]}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {formatMetricValue(metric.value, metric.unit)}
      </Text>
    </Animated.View>
  );
}

interface ResultCardProps {
  result: PayslipResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const confidencePct = Math.round(
    Math.max(0, Math.min(1, result.confidence)) * 100,
  );

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(380)}>
        <GlowCard
          glowColor={STITCH.secondaryPurple}
          pressable={false}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <Sparkles size={18} color="#0c4a6e" strokeWidth={2.5} />
            <Text style={[styles.heroTitle, RTL]} allowFontScaling={false}>
              ניתוח התלוש
            </Text>
            {result.payPeriod ? (
              <Text style={[styles.heroPeriod, RTL]} allowFontScaling={false}>
                {result.payPeriod}
              </Text>
            ) : null}
          </View>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricBlock}>
              <Text
                style={[styles.heroMetricLabel, RTL_CENTER]}
                allowFontScaling={false}
              >
                ברוטו
              </Text>
              <CountingText
                value={result.brutto}
                startDelay={120}
                suffix="₪"
                style={styles.heroBrutto}
              />
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetricBlock}>
              <Text
                style={[styles.heroMetricLabel, RTL_CENTER]}
                allowFontScaling={false}
              >
                נטו
              </Text>
              <CountingText
                value={result.netto}
                startDelay={260}
                suffix="₪"
                style={styles.heroNetto}
              />
            </View>
          </View>

          <View style={styles.heroFooterRow}>
            <View style={styles.confidenceChip}>
              <ShieldCheck size={13} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.confidenceText, RTL]}
                allowFontScaling={false}
              >
                ביטחון {confidencePct}%
              </Text>
            </View>
            <View style={styles.confidenceChip}>
              <TrendingUp size={13} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.confidenceText, RTL]}
                allowFontScaling={false}
              >
                סה״כ ניכויים{" "}
                {(Number.isFinite(result.totalDeductions)
                  ? result.totalDeductions
                  : 0
                ).toLocaleString("he-IL")}{" "}
                ₪
              </Text>
            </View>
          </View>

          {result.sharkSummary ? (
            <Animated.Text
              entering={FadeIn.delay(380).duration(280)}
              style={[styles.summary, RTL]}
              allowFontScaling={false}
            >
              {result.sharkSummary}
            </Animated.Text>
          ) : null}
        </GlowCard>
      </Animated.View>

      {result.deductions.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wallet size={16} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.sectionTitle, RTL]}
                allowFontScaling={false}
              >
                ניכויים
              </Text>
            </View>
            <View style={styles.deductionList}>
              {result.deductions.map((deduction, idx) => (
                <DeductionRow
                  key={`${deduction.kind}-${idx}`}
                  deduction={deduction}
                  index={idx}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      {result.metrics.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(180).duration(360)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.sectionTitle, RTL]}
                allowFontScaling={false}
              >
                מדדים נוספים
              </Text>
            </View>
            <View style={styles.metricsRow}>
              {result.metrics.map((metric, idx) => (
                <MetricChip
                  key={`${metric.kind}-${idx}`}
                  metric={metric}
                  index={idx}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      {result.anomalies.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(240).duration(360)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.sectionTitle, RTL]}
                allowFontScaling={false}
              >
                שווה לבדוק
              </Text>
            </View>
            <View style={styles.anomaliesList}>
              {result.anomalies.map((anomaly, idx) => (
                <AnomalyRow
                  key={`${anomaly.code}-${idx}`}
                  anomaly={anomaly}
                  index={idx}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      {result.actionItems.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(300).duration(360)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color="#0c4a6e" strokeWidth={2.5} />
              <Text
                style={[styles.sectionTitle, RTL]}
                allowFontScaling={false}
              >
                מה לעשות מחר
              </Text>
            </View>
            <View style={styles.actionList}>
              {result.actionItems.map((action, idx) => (
                <View key={idx} style={styles.actionItem}>
                  <View style={styles.actionBullet} />
                  <Text
                    style={[styles.actionText, RTL]}
                    allowFontScaling={false}
                  >
                    {action}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeIn.delay(420).duration(320)}>
        <Text style={[styles.footer, RTL_CENTER]} allowFontScaling={false}>
          {LEGAL_DISCLAIMER_SHORT}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  heroCard: {
    paddingVertical: 20,
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  heroPeriod: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    backgroundColor: "rgba(14,165,233,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroMetricsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  heroMetricBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  heroDivider: {
    width: 1,
    height: 44,
    backgroundColor: "rgba(14,165,233,0.25)",
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.4,
  },
  heroBrutto: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
  },
  heroNetto: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0369a1",
    textAlign: "center",
  },
  heroFooterRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  confidenceChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.10)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.22)",
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  summary: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0c4a6e",
    lineHeight: 19,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  deductionList: {
    gap: 8,
  },
  metricsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  anomaliesList: {
    gap: 10,
  },
  actionList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(14,165,233,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0ea5e9",
    marginTop: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0c4a6e",
    lineHeight: 19,
  },
  footer: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 16,
    paddingTop: 4,
  },
});

const deductionStyles = StyleSheet.create({
  row: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.16)",
    overflow: "hidden",
  },
  press: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  headRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0c4a6e",
  },
  amount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0369a1",
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
});

const metricStyles = StyleSheet.create({
  chip: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  value: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0c4a6e",
  },
});
