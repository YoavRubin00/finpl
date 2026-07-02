import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AccuracyHeroCardProps {
  /** 0..1 accuracy ratio. */
  accuracy: number;
  /** Total resolved votes used to compute the ratio. */
  resolvedCount: number;
  /** Current with-crowd streak — feeds the forecaster score. */
  streak?: number;
  /** Lifetime votes — feeds the forecaster score. */
  totalVotes?: number;
}

/**
 * Forecaster Score: rewards being right CONSISTENTLY, not one lucky call —
 * accuracy carries the weight, streak and participation top it up.
 */
function computeForecasterScore(accuracy: number, resolvedCount: number, streak: number, totalVotes: number): number {
  const accuracyPoints = Math.round(accuracy * 100) * Math.min(1, resolvedCount / 5);
  const streakPoints = Math.min(streak * 4, 40);
  const volumePoints = Math.min(totalVotes, 30);
  return Math.round(accuracyPoints + streakPoints + volumePoints);
}

function forecasterTitle(score: number): string {
  if (score >= 120) return "כריש-על חזאי";
  if (score >= 80) return "כריש צעיר";
  if (score >= 40) return "דולפין מחושב";
  return "דג סקרן";
}

/**
 * Purple gradient hero card at the top of CrowdWisdomHistoryScreen.
 * Shows the user's Forecaster Score (ציון חזאי) + monthly accuracy.
 */
export function AccuracyHeroCard({
  accuracy,
  resolvedCount,
  streak = 0,
  totalVotes = 0,
}: AccuracyHeroCardProps) {
  const pct = Math.round(accuracy * 100);
  const score = computeForecasterScore(accuracy, resolvedCount, streak, totalVotes);

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <LinearGradient
        colors={["#6d28d9", "#9333ea", "#a855f7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.row}>
          <Text style={styles.brainEmoji}>🧠</Text>

          <View style={styles.statBlock}>
            <Text style={styles.eyebrow}>ציון החזאי שלך</Text>
            <Text style={styles.percent}>{score}</Text>
            <Text style={styles.levelTitle}>{forecasterTitle(score)}</Text>
            <Text style={styles.subtitle}>
              {resolvedCount > 0
                ? `דיוק ${pct}% מתוך ${resolvedCount} הצבעות החודש`
                : "עדיין אין הצבעות סגורות החודש"}
            </Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          הציון עולה כשצודקים לאורך זמן — לא מניחוש אחד בר-מזל
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
  },
  brainEmoji: {
    fontSize: 56,
  },
  statBlock: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    writingDirection: "rtl",
    textAlign: "right",
    letterSpacing: 0.2,
  },
  percent: {
    fontSize: 52,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 58,
    writingDirection: "rtl",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    writingDirection: "rtl",
    textAlign: "right",
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fde68a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  footnote: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    writingDirection: "rtl",
    textAlign: "right",
  },
});