import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { LL_COLORS, RTL_STYLE } from "../tokens";
import { VisualFrame } from "./VisualFrame";
import { useCountUp } from "./useCountUp";

type CounterVisualData = Extract<FlashcardVisual, { kind: "counter" }>;

interface Props {
  visual: CounterVisualData;
  animate: boolean;
  startDelayMs: number;
}

/** Animated number counting from→to, accelerate-then-decelerate (Yoav 1.8: "מונה שמאיץ-ומאט"). */
export function CounterVisual({ visual, animate, startDelayMs }: Props) {
  const { from, to, prefix = "", suffix = "", caption, grouping = true } = visual;
  const display = useCountUp(to, { animate, delayMs: startDelayMs, grouping, from });

  return (
    <VisualFrame caption={caption} minHeight={100}>
      <Animated.Text style={styles.value} allowFontScaling={false}>
        {prefix}
        {display}
        {suffix}
      </Animated.Text>
    </VisualFrame>
  );
}

const styles = StyleSheet.create({
  value: {
    ...RTL_STYLE,
    textAlign: "center",
    color: LL_COLORS.emphasis,
    fontSize: 40,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});
