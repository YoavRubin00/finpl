import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { ITEM_STAGGER_MS, LL_COLORS, RTL_STYLE, STACK_SPRING } from "../tokens";
import { VisualFrame } from "./VisualFrame";
import { useCountUp } from "./useCountUp";

type SplitFlowData = Extract<FlashcardVisual, { kind: "split-flow" }>;

interface Props {
  visual: SplitFlowData;
  animate: boolean;
  startDelayMs: number;
}

const PALETTE = [LL_COLORS.brandCyan, LL_COLORS.emphasis, LL_COLORS.success, LL_COLORS.brandCyanBright, "#a78bfa"];

/** One amount splitting into labeled parts — budgets, salary breakdown. Static widths (real layout, not animated width), staggered "stamp-in" entrance per part. */
export function SplitFlowVisual({ visual, animate, startDelayMs }: Props) {
  const { parts, caption } = visual;

  return (
    <VisualFrame caption={caption} minHeight={44 + parts.length * 26}>
      <View style={styles.wrap}>
        <View style={styles.bar}>
          {parts.map((part, i) => (
            <BarSegment
              key={`${part.label}-${i}`}
              pct={part.pct}
              color={part.color ?? PALETTE[i % PALETTE.length]}
              animate={animate}
              delayMs={startDelayMs + i * ITEM_STAGGER_MS}
            />
          ))}
        </View>
        <View style={styles.legend}>
          {parts.map((part, i) => (
            <LegendRow
              key={`${part.label}-legend-${i}`}
              label={part.label}
              pct={part.pct}
              color={part.color ?? PALETTE[i % PALETTE.length]}
              animate={animate}
              delayMs={startDelayMs + i * ITEM_STAGGER_MS + 60}
            />
          ))}
        </View>
      </View>
    </VisualFrame>
  );
}

function BarSegment({
  pct,
  color,
  animate,
  delayMs,
}: {
  pct: number;
  color: string;
  animate: boolean;
  delayMs: number;
}) {
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(delayMs, withSpring(1, STACK_SPRING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleY: 0.25 + 0.75 * progress.value }],
  }));

  return <Animated.View style={[styles.segment, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }, style]} />;
}

function LegendRow({
  label,
  pct,
  color,
  animate,
  delayMs,
}: {
  label: string;
  pct: number;
  color: string;
  animate: boolean;
  delayMs: number;
}) {
  const pctDisplay = useCountUp(pct, { animate, delayMs, grouping: false, from: 0 });
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(delayMs, withSpring(1, STACK_SPRING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  return (
    <Animated.View style={[styles.legendRow, style]}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.legendPct}>{pctDisplay}%</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  bar: {
    flexDirection: "row-reverse",
    width: "100%",
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  segment: {
    height: "100%",
  },
  legend: {
    marginTop: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    ...RTL_STYLE,
    flex: 1,
    color: LL_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  legendPct: {
    ...RTL_STYLE,
    color: LL_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
