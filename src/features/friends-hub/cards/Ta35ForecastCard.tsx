import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Trophy, Clock } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { STITCH } from "../../../constants/theme";
import { mediumHaptic } from "../../../utils/haptics";
import { useCrowdWisdomStore } from "../../crowd-wisdom/useCrowdWisdomStore";
import { getCurrentWeekId } from "../../fantasy-league/fantasyData";
import { getApiBase } from "../../../db/apiBase";
import type { LiveMarketData, RateItem } from "../../live-news/liveMarketTypes";

interface ForecastBracket {
  id: string;
  label: string;
  accentColor: string;
}

const BRACKET_COLORS = ["#dc2626", "#ea580c", "#facc15", "#10b981", "#0891b2"] as const;

/** Round an index level to a "clean" 5-point grid for readable bracket edges. */
function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

const fmt = (n: number): string => n.toLocaleString("en-US");

/**
 * Brackets derived from the LIVE index level: edges at ±0.5% and ±1.5%
 * around today's price, so the question always stays relevant.
 */
function buildBrackets(level: number): ForecastBracket[] {
  const e1 = roundTo5(level * 0.985);
  const e2 = roundTo5(level * 0.995);
  const e3 = roundTo5(level * 1.005);
  const e4 = roundTo5(level * 1.015);
  const labels = [
    `מתחת ל-${fmt(e1)}`,
    `${fmt(e1)} – ${fmt(e2)}`,
    `${fmt(e2)} – ${fmt(e3)}`,
    `${fmt(e3)} – ${fmt(e4)}`,
    `מעל ${fmt(e4)}`,
  ];
  return labels.map((label, i) => ({
    id: `b${i + 1}`,
    label,
    accentColor: BRACKET_COLORS[i],
  }));
}

// Fallback when the live API is unreachable — roughly current index territory.
const FALLBACK_LEVEL = 4100;
// "No big move" center bracket — the statistical prior for a weekly index
// move, used only for the internal herd-bias streak (never displayed).
const MAJORITY_ID = "b3";

/** Hours left until Thursday's TASE close (~17:25 IL). The Tel-Aviv stock
 *  exchange trades Sunday-Thursday, so the WEEKLY close is Thursday — not
 *  Friday like the US market (Yoav 2026-07-02). */
function hoursToThursdayClose(now: Date = new Date()): number {
  const d = new Date(now);
  const daysUntilThu = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilThu);
  d.setHours(17, 25, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return Math.max(1, Math.round((d.getTime() - now.getTime()) / 3_600_000));
}

export function Ta35ForecastCard(): React.ReactElement {
  // One question per market week — resets every week automatically.
  const questionId = `forecast_ta35_${getCurrentWeekId()}`;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [liveTa35, setLiveTa35] = useState<RateItem | null>(null);
  const recordVote = useCrowdWisdomStore((s) => s.recordVote);
  const previousVote = useCrowdWisdomStore((s) => s.votes[questionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/market/live`);
        if (!res.ok) return;
        const data = (await res.json()) as LiveMarketData;
        const ta35 = data.rates.find((r) => r.label === 'ת"א 35');
        if (!cancelled && ta35 && isFinite(ta35.numericValue)) setLiveTa35(ta35);
      } catch {
        /* offline — fallback brackets stay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const level = liveTa35?.numericValue ?? FALLBACK_LEVEL;
  const BRACKETS = useMemo(() => buildBrackets(level), [level]);
  const hoursToClose = useMemo(() => hoursToThursdayClose(), []);

  // If the user already voted from the crowd-wisdom screen, surface the choice here.
  const effectiveSelectedId = previousVote?.choiceId ?? selectedId;
  const effectiveSubmitted = !!previousVote || submitted;

  // Auto-vote: tapping a bracket casts the vote immediately (no separate CTA).
  const handleSelect = (id: string) => {
    if (effectiveSubmitted) return;
    mediumHaptic();
    setSelectedId(id);
    const withCrowd = id === MAJORITY_ID;
    recordVote(
      { questionId, choiceId: id, votedAt: Date.now() },
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
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>תחזית ת״א 35 השבועית</Text>
            <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.2}>איפה המדד ייסגר ביום ה׳?</Text>
          </View>
          <View
            style={styles.clockChip}
            accessible
            accessibilityLabel={`נותרו ${hoursToClose} שעות עד הסגירה`}
          >
            <Clock size={11} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.clockText} maxFontSizeMultiplier={1.2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {hoursToClose}ש׳
            </Text>
          </View>
        </View>

        {/* Live index level */}
        {liveTa35 && (
          <Animated.View entering={FadeIn.duration(240)} style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText} maxFontSizeMultiplier={1.2}>
              עכשיו: {liveTa35.value} נק׳
            </Text>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[
                styles.liveChange,
                {
                  color:
                    liveTa35.direction === "up"
                      ? "#4ade80"
                      : liveTa35.direction === "down"
                        ? "#fca5a5"
                        : "rgba(255,255,255,0.8)",
                },
              ]}
            >
              {liveTa35.changePct > 0 ? "+" : ""}
              {liveTa35.changePct}% היום
            </Text>
          </Animated.View>
        )}

        {/* Brackets */}
        <View
          style={styles.brackets}
          accessibilityRole="radiogroup"
          accessibilityLabel="טווחי סגירה אפשריים לת״א 35"
        >
          {BRACKETS.map((bracket) => {
            const isSelected = effectiveSelectedId === bracket.id;
            return (
              <Pressable
                key={bracket.id}
                onPress={() => handleSelect(bracket.id)}
                hitSlop={8}
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
                <Text style={styles.bracketLabel} maxFontSizeMultiplier={1.2}>{bracket.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Result — the vote is cast on bracket tap; show the confirmation */}
        {effectiveSubmitted ? (
          <Animated.View entering={FadeIn.duration(280)} style={styles.successBanner}>
            <Text style={styles.successTitle} maxFontSizeMultiplier={1.2}>נשמרה התחזית שלכם</Text>
            <Text style={styles.successBody} maxFontSizeMultiplier={1.2}>
              התוצאה נסגרת ביום ה׳ עם שער הסגירה של הבורסה בת״א.
            </Text>
          </Animated.View>
        ) : null}
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
  liveRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  liveText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  liveChange: {
    fontSize: 12,
    fontWeight: "800",
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
