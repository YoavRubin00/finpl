import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, X } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { HistoryEntry } from "../types";

interface HistoryRowProps {
  entry: HistoryEntry;
  index: number;
}

/**
 * Single row in the voting-history screen. Three columns (RTL right→left):
 *  • אתה  — user's choice with check/X icon (green/red)
 *  • הקהל — majority choice + % support
 *  • בפועל — resolved outcome with check/X icon (or "ממתין" placeholder)
 *
 * The card also shows the question prompt and a "לפני N ימים" timestamp.
 */
export function HistoryRow({ entry, index }: HistoryRowProps) {
  const { question, userVote, outcome, crowdMajority } = entry;

  const userChoice = question.choices.find((c) => c.id === userVote.choiceId);
  const crowdChoice = question.choices.find((c) => c.id === crowdMajority.choiceId);
  const winningChoice = outcome?.winningChoiceId
    ? question.choices.find((c) => c.id === outcome.winningChoiceId)
    : null;

  const userCorrect = winningChoice ? winningChoice.id === userVote.choiceId : null;
  const ago = formatRelativeDate(userVote.votedAt);

  return (
    <Animated.View
      entering={FadeInDown.delay(60 * index).duration(280)}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.relativeDate}>{ago}</Text>
        <Text style={styles.prompt} numberOfLines={2}>{question.prompt}</Text>
      </View>

      <View style={styles.cols}>
        {/* You */}
        <View style={styles.col}>
          <Text style={styles.colHeader}>אתה</Text>
          <Text
            style={[
              styles.colValue,
              userCorrect === true && styles.valueGreen,
              userCorrect === false && styles.valueRed,
            ]}
          >
            {userChoice?.label ?? "?"}
            {userCorrect === true ? " ✓" : userCorrect === false ? " ✗" : ""}
          </Text>
        </View>

        {/* Crowd */}
        <View style={styles.col}>
          <Text style={styles.colHeader}>הקהל</Text>
          <Text style={styles.colValue}>
            {crowdChoice?.label ?? "?"} ({Math.round(crowdMajority.percent)}%)
          </Text>
        </View>

        {/* Actual */}
        <View style={styles.col}>
          <Text style={styles.colHeader}>בפועל</Text>
          {outcome ? (
            <View style={styles.outcomeRow}>
              {winningChoice ? (
                userCorrect ? (
                  <Check size={14} color="#16a34a" strokeWidth={2.6} />
                ) : (
                  <X size={14} color="#dc2626" strokeWidth={2.6} />
                )
              ) : null}
              <Text
                style={[
                  styles.colValue,
                  userCorrect === true ? styles.valueGreen : styles.valueRed,
                ]}
              >
                {outcome.outcomeText}
              </Text>
            </View>
          ) : (
            <Text style={styles.colValuePending}>ממתין</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function formatRelativeDate(ts: number): string {
  const diffMs = Date.now() - ts;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 14) return "לפני שבוע";
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  return `לפני ${Math.floor(days / 30)} חודשים`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  prompt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
    lineHeight: 19,
  },
  relativeDate: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    writingDirection: "rtl",
    textAlign: "left",
  },
  cols: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 8,
  },
  col: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    writingDirection: "rtl",
    textAlign: "right",
  },
  colValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
  },
  colValuePending: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    fontStyle: "italic",
    writingDirection: "rtl",
    textAlign: "right",
  },
  valueGreen: {
    color: "#16a34a",
  },
  valueRed: {
    color: "#dc2626",
  },
  outcomeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
});
