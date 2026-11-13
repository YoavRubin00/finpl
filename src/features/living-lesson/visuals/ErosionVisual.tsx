import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Package, Tag, TrendingUp } from "lucide-react-native";
import { LL_COLORS } from "../tokens";
import { StageFrame } from "./flow/StageFrame";
import { useRoundClock } from "./flow/useRoundClock";
import { backOut, clamp01, easeOut, fadeAt } from "./flow/flowTimeline";
import { DROP_PX, EROSION_PER_ROW, TAG_GROW, layoutErosion } from "./flow/erosionLayout";
import type { ErosionVisualSpec } from "./flow/flowTypes";

interface Props {
  visual: ErosionVisualSpec;
  animate: boolean;
  startDelayMs: number;
}

const LEAD_MS = 500;
/** ms between two price steps. */
const STEP_MS = 760;
/** ms after a price step when its item leaves the basket. */
const DROP_AFTER_MS = 220;
const DROP_MS = 420;
const TAIL_MS = 700;
const MAX_ITEMS = 10;
const PLACEHOLDER_H = 130;
/** The fixed word under the banknote. */
const NOTE_CAPTION = "אותו שטר";

/**
 * Purchasing power in one glance: the banknote never changes, the price tag
 * grows a step at a time, and with every step one item leaves the basket.
 * Sizes come from erosionLayout.ts (measured width, font scale, safe margin).
 * Same clock, same round and same reduced-motion behaviour as the diagrams.
 */
export function ErosionVisual({ visual, animate, startDelayMs }: Props) {
  const items = Math.max(1, Math.min(MAX_ITEMS, Math.round(visual.items)));
  const lost = Math.max(0, Math.min(items, Math.round(visual.lost)));
  const lastDrop = LEAD_MS + Math.max(0, lost - 1) * STEP_MS + DROP_AFTER_MS + DROP_MS;
  const endMs = lastDrop + TAIL_MS;
  const { fontScale } = useWindowDimensions();

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    // The stage's own 1 px border on each side is not drawable area.
    const w = Math.round(e.nativeEvent.layout.width) - 2;
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const layout = useMemo(
    () =>
      width > 0
        ? layoutErosion({
            width,
            fontScale,
            items,
            noteLabel: visual.noteLabel,
            priceLabel: visual.priceLabel,
            basketLabel: visual.basketLabel,
            noteCaption: NOTE_CAPTION,
          })
        : null,
    [width, fontScale, items, visual.noteLabel, visual.priceLabel, visual.basketLabel],
  );

  const { clock, replay } = useRoundClock({ animate, endMs, startDelayMs, payoffAt: lastDrop, payoffIsGood: false });

  const growBy = TAG_GROW - 1;
  const tagStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const live = 1 - fadeAt(c, endMs);
    let grown = 0;
    for (let i = 0; i < lost; i++) {
      grown += easeOut(clamp01((c - (LEAD_MS + i * STEP_MS)) / 360));
    }
    const share = lost > 0 ? (grown / lost) * live : 0;
    return { transform: [{ scale: 1 + growBy * share }] };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - LEAD_MS) / 320) * (1 - fadeAt(c, endMs));
    // Capped at 1: the badge never grows past the box the layout gave it.
    return { opacity: k, transform: [{ scale: Math.min(1, 0.6 + 0.4 * Math.max(0, backOut(k))) }] };
  });

  const labelStyle = layout ? { fontSize: layout.labelFont, lineHeight: layout.labelLH } : null;

  return (
    <StageFrame
      height={layout?.height ?? PLACEHOLDER_H}
      a11y={visual.a11y}
      caption={visual.caption}
      example={visual.example}
      onStageLayout={onLayout}
      onReplay={animate ? replay : undefined}
    >
      {layout && labelStyle ? (
        <>
          <View style={[styles.note, { left: layout.note.x, top: layout.note.y, width: layout.note.w, height: layout.note.h }]}>
            <View style={styles.noteInner}>
              <Text style={[styles.noteText, { fontSize: layout.noteFont }]} numberOfLines={1} allowFontScaling={false}>
                {visual.noteLabel}
              </Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.priceTag,
              { left: layout.tag.x, top: layout.tag.y, width: layout.tag.w, height: layout.tag.h, borderRadius: layout.tag.w / 2 },
              tagStyle,
            ]}
          >
            <Tag size={layout.tag.w * 0.52} color="#b91c1c" strokeWidth={2.2} />
          </Animated.View>
          <Animated.View
            style={[
              styles.arrow,
              { left: layout.arrow.x, top: layout.arrow.y, width: layout.arrow.w, height: layout.arrow.h, borderRadius: layout.arrow.w / 2 },
              arrowStyle,
            ]}
          >
            <TrendingUp size={layout.arrow.w * 0.58} color="#ffffff" strokeWidth={3} />
          </Animated.View>

          {Array.from({ length: items }, (_, i) => {
            // Reading order starts at the right; the last items are the ones that drop out.
            const col = i % EROSION_PER_ROW;
            const row = Math.floor(i / EROSION_PER_ROW);
            const x = layout.basket.x + layout.basket.w - layout.item - col * (layout.item + layout.itemGap);
            const y = layout.basket.y + row * (layout.item + layout.itemGap);
            const lostIndex = i - (items - lost);
            return (
              <BasketItem
                key={i}
                x={x}
                y={y}
                size={layout.item}
                dropAt={lostIndex >= 0 ? LEAD_MS + lostIndex * STEP_MS + DROP_AFTER_MS : null}
                clock={clock}
                endMs={endMs}
              />
            );
          })}

          <Text
            style={[styles.colLabel, labelStyle, { left: layout.labels.note.x, top: layout.labels.note.y, width: layout.labels.note.w }]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {NOTE_CAPTION}
          </Text>
          <Text
            style={[styles.colLabel, labelStyle, { left: layout.labels.price.x, top: layout.labels.price.y, width: layout.labels.price.w }]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {visual.priceLabel}
          </Text>
          <Text
            style={[styles.colLabel, labelStyle, { left: layout.labels.basket.x, top: layout.labels.basket.y, width: layout.labels.basket.w }]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {visual.basketLabel}
          </Text>
        </>
      ) : null}
    </StageFrame>
  );
}

function BasketItem({
  x,
  y,
  size,
  dropAt,
  clock,
  endMs,
}: {
  x: number;
  y: number;
  size: number;
  dropAt: number | null;
  clock: SharedValue<number>;
  endMs: number;
}) {
  const box = { left: x, top: y, width: size, height: size, borderRadius: size * 0.34 };
  if (dropAt === null) {
    return (
      <View style={[styles.item, box]}>
        <Package size={size * 0.55} color="#b45309" strokeWidth={2.2} />
      </View>
    );
  }
  return <DroppingItem box={box} iconSize={size * 0.55} dropAt={dropAt} clock={clock} endMs={endMs} />;
}

function DroppingItem({
  box,
  iconSize,
  dropAt,
  clock,
  endMs,
}: {
  box: { left: number; top: number; width: number; height: number; borderRadius: number };
  iconSize: number;
  dropAt: number;
  clock: SharedValue<number>;
  endMs: number;
}) {
  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = easeOut(clamp01((c - dropAt) / DROP_MS)) * (1 - fadeAt(c, endMs));
    return {
      opacity: 1 - 0.84 * k,
      transform: [{ translateY: k * DROP_PX }, { rotate: `${k * 12}deg` }, { scale: 1 - 0.14 * k }],
    };
  });
  return (
    <Animated.View style={[styles.item, box, style]}>
      <Package size={iconSize} color="#b45309" strokeWidth={2.2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  colLabel: {
    position: "absolute",
    color: LL_COLORS.textPrimary,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
  },
  note: {
    position: "absolute",
    borderRadius: 9,
    backgroundColor: "#dcfce7",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderBottomWidth: 4,
    padding: 3,
  },
  noteInner: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(21,128,61,0.35)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: {
    color: "#15803d",
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  priceTag: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderBottomWidth: 4,
  },
  arrow: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  item: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderBottomWidth: 3,
  },
});
