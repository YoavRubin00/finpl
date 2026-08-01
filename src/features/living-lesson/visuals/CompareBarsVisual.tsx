import React, { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { ITEM_STAGGER_MS, LL_COLORS, RACE_SPRING, RTL_STYLE } from "../tokens";
import { VisualFrame } from "./VisualFrame";

type CompareBarsData = Extract<FlashcardVisual, { kind: "compare-bars" }>;

interface Props {
  visual: CompareBarsData;
  animate: boolean;
  startDelayMs: number;
}

/**
 * Horizontal RTL race-bars. The label sits on the right (row-reverse first
 * child), the bar fills right→left toward its value, and the value label
 * rides at the bar's growing tip. Growth is done with translateX inside an
 * `overflow: hidden` track (not an animated width) so it's fully native-thread.
 */
export function CompareBarsVisual({ visual, animate, startDelayMs }: Props) {
  const { items, caption } = visual;
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <VisualFrame caption={caption} minHeight={items.length * 46}>
      <View style={styles.stack}>
        {items.map((item, i) => (
          <BarRow
            key={`${item.label}-${i}`}
            label={item.label}
            valueLabel={item.valueLabel}
            color={item.color ?? LL_COLORS.brandCyan}
            fraction={Math.max(0, Math.min(1, item.value / maxValue))}
            animate={animate}
            delayMs={startDelayMs + i * ITEM_STAGGER_MS}
          />
        ))}
      </View>
    </VisualFrame>
  );
}

function BarRow({
  label,
  valueLabel,
  color,
  fraction,
  animate,
  delayMs,
}: {
  label: string;
  valueLabel?: string;
  color: string;
  fraction: number;
  animate: boolean;
  delayMs: number;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(animate ? 0 : fraction);

  React.useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(delayMs, withSpring(fraction, RACE_SPRING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackWidth]);

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackWidth * (1 - progress.value) }],
    backgroundColor: color,
  }));

  const tipLabelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -trackWidth * progress.value }],
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.row}>
      <View style={styles.labelChip}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.trackWrap}>
        <View style={styles.track} onLayout={onLayout}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        {valueLabel && trackWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.tipLabelWrap, tipLabelStyle]}>
            <Text style={styles.tipLabelText} numberOfLines={1}>
              {valueLabel}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
    gap: 26,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  labelChip: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  labelText: {
    ...RTL_STYLE,
    color: LL_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  trackWrap: {
    flex: 1,
    height: 16,
    justifyContent: "center",
  },
  track: {
    width: "100%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(12,74,110,0.08)",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 7,
  },
  tipLabelWrap: {
    position: "absolute",
    right: 0,
    bottom: 18,
  },
  tipLabelText: {
    ...RTL_STYLE,
    color: LL_COLORS.emphasis,
    fontSize: 12.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
