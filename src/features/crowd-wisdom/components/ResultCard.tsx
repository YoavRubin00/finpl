import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Brain, Clock, Zap, Handshake, Sparkles } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import type { PostVoteSnapshot } from "../types";

interface ResultCardProps {
  snapshot: PostVoteSnapshot;
  /** Hours remaining until the question closes. */
  closesInHours: number;
}

/**
 * Post-vote view that reveals:
 *  • A multi-color horizontal bar showing the full distribution
 *  • Each choice with its %, color-dot, label, and a "הצבעת" pill on the user's pick
 *  • A verdict banner:
 *      ─ Green "אתה עם ההמון" when user matches the majority
 *      ─ Blue "אתה נגד הזרם" when user picked a minority choice
 */
export function ResultCard({ snapshot, closesInHours }: ResultCardProps) {
  const { question, distribution, totalVoters, userIsWithCrowd, userChoiceId, majorityChoiceId } = snapshot;

  const majorityRow = distribution.find((d) => d.choiceId === majorityChoiceId);
  const majorityPercent = majorityRow ? Math.round(majorityRow.percent) : 0;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.brainBadge}>
            <Brain size={18} color="#ffffff" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>תוצאות חכמת ההמונים</Text>
            <Text style={styles.brandMeta}>נסגר עוד {closesInHours}ש׳</Text>
          </View>
        </View>
        <View style={styles.clockChip}>
          <Clock size={12} color="#475569" strokeWidth={2.4} />
          <Text style={styles.clockText}>{closesInHours}ש׳</Text>
        </View>
      </View>

      {/* Prompt */}
      <Text style={styles.prompt}>{question.prompt}</Text>

      {/* Distribution bar (multi-color stacked) */}
      <View style={styles.distBar}>
        {distribution.map((row) => {
          const choice = question.choices.find((c) => c.id === row.choiceId);
          if (!choice) return null;
          return (
            <View
              key={row.choiceId}
              style={{
                width: `${row.percent}%`,
                backgroundColor: choice.accentColor,
              }}
            />
          );
        })}
      </View>

      {/* Choice rows with %, dot, label, and "הצבעת" pill on user pick */}
      <View style={styles.choices}>
        {question.choices.map((choice) => {
          const row = distribution.find((d) => d.choiceId === choice.id);
          const isUserChoice = choice.id === userChoiceId;
          const percent = row ? Math.round(row.percent) : 0;
          return (
            <Animated.View
              key={choice.id}
              entering={FadeInDown.delay(120).duration(280)}
              style={[styles.choiceRow, isUserChoice && styles.choiceRowUser]}
            >
              <Text style={styles.percentText}>{percent}%</Text>
              {isUserChoice ? (
                <View style={styles.votedPill}>
                  <Text style={styles.votedPillText}>הצבעת</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <Text style={styles.choiceLabel}>
                {choice.glyph ? `${choice.glyph} ` : ""}{choice.label}
              </Text>
              <View style={[styles.choiceDot, { backgroundColor: choice.accentColor }]} />
            </Animated.View>
          );
        })}
      </View>

      {/* Verdict banner */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(360)}
        style={[
          styles.verdict,
          userIsWithCrowd ? styles.verdictWithCrowd : styles.verdictAgainstCrowd,
        ]}
      >
        <View style={styles.verdictLeft}>
          <View style={styles.xpReward}>
            <Text style={styles.xpRewardValue}>+100 🪙</Text>
            <Zap size={14} color="#ffffff" strokeWidth={2.6} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>
            {userIsWithCrowd ? "הצבעתם עם ההמון" : "הצבעתם נגד הזרם"}
          </Text>
          <Text style={styles.verdictSubtitle}>
            {userIsWithCrowd
              ? `הצטרפתם לרוב של ${majorityPercent}% מהמשקיעים`
              : `רוב המשקיעים (${majorityPercent}%) חשבו אחרת`}
          </Text>
        </View>
        <View style={styles.verdictIcon}>
          {userIsWithCrowd ? (
            <Handshake size={24} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <Sparkles size={24} color="#ffffff" strokeWidth={2.4} />
          )}
        </View>
      </Animated.View>

      {/* Captain Shark on herd bias — the crowd is a signal, not proof */}
      <Animated.View entering={FadeInDown.delay(420).duration(360)} style={styles.sharkNote}>
        <Text style={styles.sharkNoteText}>
          {userIsWithCrowd
            ? "קפטן שארק: ההמון צודק לא מעט — אבל נוטה לאופטימיות יתר. רוב גדול זה סנטימנט, לא הוכחה."
            : "קפטן שארק: לשחות נגד הזרם דורש אומץ — החזאים הכי טובים יודעים מתי ההמון מתלהב מדי."}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sharkNote: {
    backgroundColor: "#eff8ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sharkNoteText: {
    fontSize: 12,
    color: "#075985",
    lineHeight: 17,
    writingDirection: "rtl",
    textAlign: "right",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brandRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  brainBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7c3aed",
    writingDirection: "rtl",
    textAlign: "right",
  },
  brandMeta: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    writingDirection: "rtl",
    textAlign: "right",
  },
  clockChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  clockText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  prompt: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 26,
  },
  distBar: {
    flexDirection: "row-reverse",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  choices: {
    gap: 10,
  },
  choiceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    gap: 10,
  },
  choiceRowUser: {
    backgroundColor: "#fef9c3",
    borderWidth: 1.5,
    borderColor: "#facc15",
  },
  choiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
  },
  votedPill: {
    backgroundColor: "#facc15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  votedPillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#78350f",
    writingDirection: "rtl",
  },
  percentText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e293b",
    minWidth: 38,
    textAlign: "left",
  },
  verdict: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  verdictWithCrowd: {
    backgroundColor: "#16a34a",
  },
  verdictAgainstCrowd: {
    backgroundColor: "#2563eb",
  },
  verdictLeft: {
    alignItems: "center",
  },
  xpReward: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpRewardValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "right",
  },
  verdictSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 2,
  },
  verdictIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});