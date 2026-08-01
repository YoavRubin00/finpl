import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { ITEM_STAGGER_MS, LL_COLORS, RTL_STYLE, STACK_SPRING } from "../tokens";
import { VisualFrame } from "./VisualFrame";
import { useCountUp } from "./useCountUp";

type CoinStackData = Extract<FlashcardVisual, { kind: "coin-stack" }>;

interface Props {
  visual: CoinStackData;
  animate: boolean;
  startDelayMs: number;
}

const MAX_BAR_PX = 110;
const BAR_W = 30;

/** Coins/blocks stacking up one step at a time, small bounce per step — accumulation, savings. */
export function CoinStackVisual({ visual, animate, startDelayMs }: Props) {
  const { steps, caption } = visual;
  const maxStep = Math.max(...steps, 1);
  const totalDelay = startDelayMs + (steps.length - 1) * ITEM_STAGGER_MS;
  const total = useCountUp(steps[steps.length - 1] ?? 0, { animate, delayMs: totalDelay, from: steps[0] ?? 0 });

  return (
    <VisualFrame caption={caption} minHeight={MAX_BAR_PX + 44}>
      <Animated.Text style={styles.total} allowFontScaling={false}>
        {total}
      </Animated.Text>
      <View style={styles.row}>
        {steps.map((value, i) => (
          <StackBlock
            key={i}
            heightPx={Math.max(10, (value / maxStep) * MAX_BAR_PX)}
            isLast={i === steps.length - 1}
            animate={animate}
            delayMs={startDelayMs + i * ITEM_STAGGER_MS}
          />
        ))}
      </View>
    </VisualFrame>
  );
}

function StackBlock({
  heightPx,
  isLast,
  animate,
  delayMs,
}: {
  heightPx: number;
  isLast: boolean;
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
    // Grows upward from a fixed baseline: scaleY around center needs a
    // translateY compensation of half the "missing" height to keep the
    // bottom edge pinned instead of the block growing from its middle.
    transform: [{ translateY: (heightPx * (1 - progress.value)) / 2 }, { scaleY: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        { height: heightPx, backgroundColor: isLast ? LL_COLORS.emphasis : LL_COLORS.brandCyan },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  total: {
    ...RTL_STYLE,
    textAlign: "center",
    color: LL_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginBottom: 14,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 8,
    height: MAX_BAR_PX,
  },
  block: {
    width: BAR_W,
    borderRadius: 8,
  },
});
