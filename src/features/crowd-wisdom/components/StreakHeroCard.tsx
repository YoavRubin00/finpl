import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface StreakHeroCardProps {
  streak: number;
  /** Pills filled = consecutive with-crowd hits in the current streak (cap 5). */
  pillsTotal?: number;
  /**
   * "mini" = compact stat tile for the friends-hub CrowdWisdomCard. Used there
   * to surface the REAL participation streak (votedDates) — the eyebrow/caption/
   * emoji props relabel it so it never reads as the with-crowd streak (which is
   * derived from the invented baseline — A3 enforcement, Yoav 2026-07-02).
   */
  variant?: "full" | "mini";
  eyebrow?: string;
  caption?: string;
  emoji?: string;
  /** Show the 2x-XP bonus chip (a with-crowd mechanic). Off in participation contexts. */
  showBonus?: boolean;
}

/**
 * Purple gradient hero card showing the user's "with-crowd" streak.
 * Renders pip dots — gold = filled (within streak), gray = unfilled.
 * Right side: brain emoji + streak number. Left side: "2x XP בונוס" pill.
 */
export function StreakHeroCard({
  streak,
  pillsTotal = 5,
  variant = "full",
  eyebrow = "רצף חכמת ההמונים",
  caption = "הצבעות עם הרוב",
  emoji = "🧠",
  showBonus = true,
}: StreakHeroCardProps) {
  const filledPips = Math.min(streak, pillsTotal);

  if (variant === "mini") {
    return (
      <LinearGradient
        colors={["#6d28d9", "#9333ea"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.miniCard}
        accessible
        accessibilityLabel={`${eyebrow}: ${streak} ${caption}`}
      >
        <Text style={styles.miniEyebrow} maxFontSizeMultiplier={1.2}>
          {eyebrow}
        </Text>
        <View style={styles.miniValueRow}>
          <Text style={styles.miniValue} maxFontSizeMultiplier={1.2}>
            {streak}
          </Text>
          <Text style={styles.miniEmoji} maxFontSizeMultiplier={1.2}>
            {emoji}
          </Text>
        </View>
        <Text style={styles.miniCaption} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {caption}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <LinearGradient
        colors={["#6d28d9", "#9333ea", "#a855f7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.streakBlock}>
            <Text style={styles.eyebrow}>רצף חכמת ההמונים</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.brainEmoji}>🧠</Text>
            </View>
            <Text style={styles.streakLabel}>הצבעות עם הרוב</Text>
          </View>

          {showBonus && streak > 0 ? (
            <View style={styles.bonusChip}>
              <Text style={styles.bonusValue}>בונוס</Text>
              <Text style={styles.bonusXp}>2x</Text>
              <Text style={styles.bonusValue}>XP</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pipsRow}>
          {Array.from({ length: pillsTotal }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                i < filledPips ? styles.pipFilled : styles.pipEmpty,
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
  },
  miniCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: "hidden",
    minHeight: 88,
    justifyContent: "center",
  },
  miniEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    writingDirection: "rtl",
    textAlign: "right",
  },
  miniValueRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  miniValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 34,
  },
  miniEmoji: {
    fontSize: 22,
  },
  miniCaption: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 1,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakBlock: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    writingDirection: "rtl",
    textAlign: "right",
    letterSpacing: 0.2,
  },
  streakRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  brainEmoji: {
    fontSize: 38,
  },
  streakNumber: {
    fontSize: 44,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 50,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    writingDirection: "rtl",
    textAlign: "right",
  },
  bonusChip: {
    alignItems: "center",
    backgroundColor: "#facc15",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#fde047",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  bonusValue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#78350f",
    writingDirection: "rtl",
  },
  bonusXp: {
    fontSize: 22,
    fontWeight: "900",
    color: "#78350f",
    lineHeight: 24,
  },
  pipsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 14,
    alignSelf: "flex-end",
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pipFilled: {
    backgroundColor: "#facc15",
    borderWidth: 1.5,
    borderColor: "#fde68a",
  },
  pipEmpty: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
});