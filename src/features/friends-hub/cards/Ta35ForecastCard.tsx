import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Trophy, Clock, Zap } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { STITCH } from "../../../constants/theme";
import { tapHaptic, mediumHaptic } from "../../../utils/haptics";
import { useCrowdWisdomStore } from "../../crowd-wisdom/useCrowdWisdomStore";

interface ForecastBracket {
  id: string;
  label: string;
  /** Seed vote percentage shown in the distribution bar. */
  seedPercent: number;
  accentColor: string;
}

// Brackets from the plan: under 2050, 2050-2080, 2080-2110, 2110-2140, over 2140
const BRACKETS: readonly ForecastBracket[] = [
  { id: "below_2050",  label: "מתחת ל-2,050",  seedPercent: 9,  accentColor: "#dc2626" },
  { id: "2050_2080",   label: "2,050 – 2,080", seedPercent: 20, accentColor: "#ea580c" },
  { id: "2080_2110",   label: "2,080 – 2,110", seedPercent: 40, accentColor: "#facc15" },
  { id: "2110_2140",   label: "2,110 – 2,140", seedPercent: 24, accentColor: "#10b981" },
  { id: "above_2140",  label: "מעל 2,140",     seedPercent: 7,  accentColor: "#0891b2" },
];

const QUESTION_ID = "forecast_ta35_friday";
const HOURS_TO_CLOSE = 84;

export function Ta35ForecastCard(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const recordVote = useCrowdWisdomStore((s) => s.recordVote);
  const previousVote = useCrowdWisdomStore((s) => s.votes[QUESTION_ID]);

  // If the user already voted from the crowd-wisdom screen, surface the choice here.
  const effectiveSelectedId = previousVote?.choiceId ?? selectedId;
  const effectiveSubmitted = !!previousVote || submitted;

  const handleSelect = (id: string) => {
    if (effectiveSubmitted) return;
    tapHaptic();
    setSelectedId(id);
  };

  const handleSubmit = () => {
    if (!selectedId || effectiveSubmitted) return;
    mediumHaptic();
    // Majority bracket here = "2080_2110" (40%). Determine with-crowd locally.
    const majorityId = "2080_2110";
    const withCrowd = selectedId === majorityId;
    recordVote(
      { questionId: QUESTION_ID, choiceId: selectedId, votedAt: Date.now() },
      withCrowd,
    );
    setSubmitted(true);
  };

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.cardWrap}>
      <LinearGradient
        colors={["#5b21b6", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Trophy size={20} color="#facc15" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>תחזית ת״א 35 השבועית</Text>
            <Text style={styles.headerSubtitle}>איפה המדד ייסגר ביום ה׳?</Text>
          </View>
          <View style={styles.clockChip}>
            <Clock size={11} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.clockText}>{HOURS_TO_CLOSE}ש׳</Text>
          </View>
        </View>

        {/* Brackets */}
        <View style={styles.brackets}>
          {BRACKETS.map((bracket) => {
            const isSelected = effectiveSelectedId === bracket.id;
            return (
              <Pressable
                key={bracket.id}
                onPress={() => handleSelect(bracket.id)}
                style={[
                  styles.bracket,
                  isSelected && styles.bracketSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: effectiveSubmitted }}
                accessibilityLabel={bracket.label}
              >
                <View
                  style={[
                    styles.radio,
                    isSelected && { borderColor: "#facc15", backgroundColor: "#facc15" },
                  ]}
                />
                <Text style={styles.bracketLabel}>{bracket.label}</Text>

                {effectiveSubmitted ? (
                  <View style={styles.bracketBarTrack}>
                    <View
                      style={[
                        styles.bracketBarFill,
                        {
                          width: `${bracket.seedPercent}%`,
                          backgroundColor: bracket.accentColor,
                        },
                      ]}
                    />
                    <Text style={styles.bracketBarPct}>{bracket.seedPercent}%</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* CTA / Result */}
        {!effectiveSubmitted ? (
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedId}
            style={[styles.ctaBar, !selectedId && styles.ctaBarDisabled]}
            accessibilityRole="button"
            accessibilityLabel="הצביעו על התחזית"
            accessibilityState={{ disabled: !selectedId }}
          >
            <View style={styles.xpChips}>
              <View style={styles.xpChip}>
                <Zap size={11} color="#7c3aed" strokeWidth={2.6} />
                <Text style={styles.xpChipValue}>+25</Text>
              </View>
              <View style={[styles.xpChip, styles.xpChipGold]}>
                <Trophy size={11} color="#78350f" strokeWidth={2.6} />
                <Text style={[styles.xpChipValue, { color: "#78350f" }]}>גולדן +100</Text>
              </View>
            </View>
            <Text style={styles.ctaText}>
              {selectedId ? "הצביעו על התחזית" : "בחרו טווח כדי להמשיך"}
            </Text>
          </Pressable>
        ) : (
          <Animated.View entering={FadeIn.duration(280)} style={styles.successBanner}>
            <Text style={styles.successTitle}>נשמרה התחזית שלכם</Text>
            <Text style={styles.successBody}>
              נסגר ביום ה׳ עם פרסום מחיר הסגירה. 10% החוזים הקרובים מקבלים גולדן.
            </Text>
          </Animated.View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#5b21b6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  gradient: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.4)",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    writingDirection: "rtl",
    textAlign: "right",
  },
  clockChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
  },
  clockText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  brackets: {
    gap: 6,
  },
  bracket: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  bracketSelected: {
    borderColor: "#facc15",
    backgroundColor: "rgba(250, 204, 21, 0.18)",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  bracketLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "right",
    minWidth: 110,
  },
  bracketBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bracketBarFill: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  bracketBarPct: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
    paddingHorizontal: 8,
  },
  ctaBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    gap: 10,
  },
  ctaBarDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#5b21b6",
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
  },
  xpChips: {
    flexDirection: "row-reverse",
    gap: 6,
  },
  xpChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#ede9fe",
    borderRadius: 999,
  },
  xpChipGold: {
    backgroundColor: "#fef3c7",
  },
  xpChipValue: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7c3aed",
  },
  successBanner: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.4)",
    gap: 4,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#facc15",
    writingDirection: "rtl",
    textAlign: "right",
  },
  successBody: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 17,
  },
  successHint: {
    color: STITCH.surfaceContainer,
  },
});
