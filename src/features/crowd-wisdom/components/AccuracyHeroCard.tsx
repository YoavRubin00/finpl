import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AccuracyHeroCardProps {
  /** 0..1 accuracy ratio. */
  accuracy: number;
  /** Total resolved votes used to compute the ratio. */
  resolvedCount: number;
}

/**
 * Purple gradient hero card at the top of CrowdWisdomHistoryScreen.
 * Shows the user's monthly prediction accuracy as a huge percentage with a
 * brain emoji and a "מתוך X הצבעות" subtitle.
 */
export function AccuracyHeroCard({ accuracy, resolvedCount }: AccuracyHeroCardProps) {
  const pct = Math.round(accuracy * 100);

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
            <Text style={styles.eyebrow}>דיוק החיזוי שלך</Text>
            <Text style={styles.percent}>{pct}%</Text>
            <Text style={styles.subtitle}>
              {resolvedCount > 0
                ? `מתוך ${resolvedCount} הצבעות החודש`
                : "עדיין אין הצבעות סגורות החודש"}
            </Text>
          </View>
        </View>
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
});