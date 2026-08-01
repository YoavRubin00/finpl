import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { ITEM_STAGGER_MS, LL_COLORS, RTL_STYLE, STACK_SPRING } from "../tokens";
import { VisualFrame } from "./VisualFrame";

type TimelineData = Extract<FlashcardVisual, { kind: "timeline" }>;

interface Props {
  visual: TimelineData;
  animate: boolean;
  startDelayMs: number;
}

/**
 * Horizontal RTL timeline — milestones light up in order, right (earliest)
 * to left (latest), matching how the rest of the reading order flows.
 */
export function TimelineVisual({ visual, animate, startDelayMs }: Props) {
  const { milestones, caption } = visual;

  return (
    <VisualFrame caption={caption} minHeight={104}>
      <View style={styles.row}>
        <View style={styles.connector} />
        {milestones.map((m, i) => (
          <MilestoneNode
            key={`${m.label}-${i}`}
            label={m.label}
            sublabel={m.sublabel}
            isLast={i === milestones.length - 1}
            animate={animate}
            delayMs={startDelayMs + i * ITEM_STAGGER_MS}
          />
        ))}
      </View>
    </VisualFrame>
  );
}

function MilestoneNode({
  label,
  sublabel,
  isLast,
  animate,
  delayMs,
}: {
  label: string;
  sublabel?: string;
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

  const nodeStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 6 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));

  return (
    <View style={styles.node}>
      <Animated.View style={nodeStyle}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
      <View style={styles.dotOuter}>
        <Animated.View style={[styles.dotInner, dotStyle, { backgroundColor: isLast ? LL_COLORS.emphasis : LL_COLORS.brandCyan }]} />
      </View>
      {sublabel ? (
        <Animated.View style={nodeStyle}>
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 42,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  node: {
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LL_COLORS.bgPanel,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    ...RTL_STYLE,
    textAlign: "center",
    color: LL_COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: "800",
  },
  sublabel: {
    ...RTL_STYLE,
    textAlign: "center",
    color: LL_COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
