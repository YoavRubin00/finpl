import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Brain, Clock } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { mediumHaptic } from "../../../utils/haptics";
import { BetPanel } from "./BetPanel";
import { MarketOddsHeader } from "./MarketOddsHeader";
import { GoldCoinIcon } from "../../../components/ui/GoldCoinIcon";
import type { CrowdWisdomQuestion } from "../types";

interface LivePollCardProps {
  question: CrowdWisdomQuestion;
  /** Live countdown label to close (e.g. "5ש׳" / "3י׳"). */
  timeLeftLabel: string;
  /** Triggered immediately when the user taps a choice (auto-vote). */
  onSubmit: (choiceId: string) => void;
}

/**
 * Pre-vote question card with:
 *  • Mascot avatar + meta row (voters count, time remaining)
 *  • Question prompt + ticker chip
 *  • Radio-style choices (single-select)
 *  • Sticky CTA bar that submits the vote and gates the reveal of crowd-wisdom
 */
export function LivePollCard({ question, timeLeftLabel, onSubmit }: LivePollCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-vote: tapping a choice casts the vote immediately (no separate CTA).
  const handleChoicePress = (id: string) => {
    setSelectedId(id);
    mediumHaptic();
    onSubmit(id);
  };

  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.brainBadge}>
            <Brain size={18} color="#ffffff" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>חכמת ההמונים</Text>
            <View style={styles.metaRow}>
              <Text style={styles.brandMeta}>ענו ותראו מה הקהילה חושבת</Text>
              <View style={styles.rewardChip}>
                <GoldCoinIcon size={11} />
                <Text style={styles.rewardChipText} maxFontSizeMultiplier={1.15}>+100</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.clockChip}>
          <Clock size={12} color="#475569" strokeWidth={2.4} />
          <Text style={styles.clockText}>{timeLeftLabel}</Text>
        </View>
      </View>

      {/* Prompt */}
      <Text style={styles.prompt}>{question.prompt}</Text>

      {question.contextChip ? (
        <View style={styles.contextChip}>
          <Text style={styles.contextChipText}>{question.contextChip}</Text>
        </View>
      ) : null}

      {/* Market view — implied probability as the price, Polymarket-style */}
      <MarketOddsHeader question={question} />

      {/* Choices */}
      <View style={styles.choices}>
        {question.choices.map((choice) => {
          const selected = selectedId === choice.id;
          return (
            <Pressable
              key={choice.id}
              onPress={() => handleChoicePress(choice.id)}
              style={[
                styles.choice,
                selected && { borderColor: choice.accentColor, backgroundColor: "#f8fafc" },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={choice.label}
            >
              <View
                style={[
                  styles.radio,
                  selected && {
                    borderColor: choice.accentColor,
                    backgroundColor: choice.accentColor,
                  },
                ]}
              >
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.choiceLabel}>
                {choice.glyph ? `${choice.glyph} ` : ""}{choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Coin betting — ONLY on objectively-measurable questions (a real market
          close / price / rate). Sentiment & personal-choice questions are
          vote-only: a coin wager must be settleable against reality. */}
      {question.bettable ? (
        <BetPanel question={question} selectedChoiceId={selectedId} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rewardChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  rewardChipText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#b45309",
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
  contextChip: {
    alignSelf: "flex-end",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  contextChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3730a3",
    writingDirection: "rtl",
  },
  choices: {
    gap: 8,
  },
  choice: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
  },
  ctaBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ede9fe",
    borderRadius: 14,
    gap: 10,
  },
  ctaBarDisabled: {
    backgroundColor: "#f1f5f9",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5b21b6",
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
  },
  ctaTextDisabled: {
    color: "#94a3b8",
  },
  xpChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#7c3aed",
  },
});
