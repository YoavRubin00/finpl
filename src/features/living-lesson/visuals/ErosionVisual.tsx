import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Package, Tag, TrendingUp } from "lucide-react-native";
import { LL_COLORS } from "../tokens";
import { StageFrame } from "./flow/StageFrame";
import { useRoundClock } from "./flow/useRoundClock";
import { backOut, clamp01, easeOut, fadeAt } from "./flow/flowTimeline";
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
const PER_ROW = 5;
const STAGE_H = 150;

/**
 * Purchasing power in one glance: the banknote never changes, the price tag
 * grows a step at a time, and with every step one item leaves the basket.
 * Same clock, same round and same reduced-motion behaviour as the diagrams.
 */
export function ErosionVisual({ visual, animate, startDelayMs }: Props) {
  const items = Math.max(1, Math.min(MAX_ITEMS, Math.round(visual.items)));
  const lost = Math.max(0, Math.min(items, Math.round(visual.lost)));
  const lastDrop = LEAD_MS + Math.max(0, lost - 1) * STEP_MS + DROP_AFTER_MS + DROP_MS;
  const endMs = lastDrop + TAIL_MS;

  const { clock, replay } = useRoundClock({ animate, endMs, startDelayMs, payoffAt: lastDrop, payoffIsGood: false });

  const tagStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const live = 1 - fadeAt(c, endMs);
    let grown = 0;
    for (let i = 0; i < lost; i++) {
      grown += easeOut(clamp01((c - (LEAD_MS + i * STEP_MS)) / 360));
    }
    const share = lost > 0 ? (grown / lost) * live : 0;
    return { transform: [{ scale: 1 + 0.42 * share }] };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - LEAD_MS) / 320) * (1 - fadeAt(c, endMs));
    return { opacity: k, transform: [{ translateY: (1 - k) * 6 }, { scale: 0.6 + 0.4 * Math.max(0, backOut(k)) }] };
  });

  return (
    <StageFrame
      height={STAGE_H}
      a11y={visual.a11y}
      caption={visual.caption}
      example={visual.example}
      onReplay={animate ? replay : undefined}
    >
      <View style={styles.row}>
        {/* Reading order, right to left: the note, the price, what it buys. */}
        <View style={styles.col}>
          <View style={styles.note}>
            <View style={styles.noteInner}>
              <Text style={styles.noteText}>{visual.noteLabel}</Text>
            </View>
          </View>
          <Text style={styles.colLabel} numberOfLines={1}>
            אותו שטר
          </Text>
        </View>

        <View style={styles.col}>
          <View style={styles.tagBox}>
            <Animated.View style={[styles.priceTag, tagStyle]}>
              <Tag size={24} color="#b91c1c" strokeWidth={2.2} />
            </Animated.View>
            <Animated.View style={[styles.arrow, arrowStyle]}>
              <TrendingUp size={13} color="#ffffff" strokeWidth={3} />
            </Animated.View>
          </View>
          <Text style={styles.colLabel} numberOfLines={1}>
            {visual.priceLabel}
          </Text>
        </View>

        <View style={styles.col}>
          <View style={styles.basket}>
            {Array.from({ length: items }, (_, i) => {
              // The last items in reading order are the ones that drop out.
              const lostIndex = i - (items - lost);
              return (
                <BasketItem
                  key={i}
                  dropAt={lostIndex >= 0 ? LEAD_MS + lostIndex * STEP_MS + DROP_AFTER_MS : null}
                  clock={clock}
                  endMs={endMs}
                />
              );
            })}
          </View>
          <Text style={styles.colLabel} numberOfLines={1}>
            {visual.basketLabel}
          </Text>
        </View>
      </View>
    </StageFrame>
  );
}

function BasketItem({ dropAt, clock, endMs }: { dropAt: number | null; clock: SharedValue<number>; endMs: number }) {
  if (dropAt === null) {
    return (
      <View style={styles.item}>
        <Package size={11} color="#b45309" strokeWidth={2.2} />
      </View>
    );
  }
  return <DroppingItem dropAt={dropAt} clock={clock} endMs={endMs} />;
}

function DroppingItem({ dropAt, clock, endMs }: { dropAt: number; clock: SharedValue<number>; endMs: number }) {
  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = easeOut(clamp01((c - dropAt) / DROP_MS)) * (1 - fadeAt(c, endMs));
    return {
      opacity: 1 - 0.84 * k,
      transform: [{ translateY: k * 7 }, { rotate: `${k * 14}deg` }, { scale: 1 - 0.14 * k }],
    };
  });
  return (
    <Animated.View style={[styles.item, style]}>
      <Package size={11} color="#b45309" strokeWidth={2.2} />
    </Animated.View>
  );
}

const ITEM = 20;
const ITEM_GAP = 3;

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  col: {
    alignItems: "center",
    gap: 10,
  },
  colLabel: {
    color: LL_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
  },
  note: {
    width: 76,
    height: 44,
    borderRadius: 9,
    backgroundColor: "#dcfce7",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderBottomWidth: 4,
    padding: 4,
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
    fontSize: 16,
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  tagBox: {
    width: 60,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  priceTag: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderBottomWidth: 4,
  },
  arrow: {
    position: "absolute",
    top: 0,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  basket: {
    width: PER_ROW * ITEM + (PER_ROW - 1) * ITEM_GAP,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: ITEM_GAP,
    justifyContent: "flex-start",
    minHeight: ITEM * 2 + ITEM_GAP,
  },
  item: {
    width: ITEM,
    height: ITEM,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderBottomWidth: 3,
  },
});
