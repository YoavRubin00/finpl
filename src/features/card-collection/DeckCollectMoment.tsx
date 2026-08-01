import { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  useReducedMotion,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { getDeckForModule, type DeckCard } from "./deckCatalog";

/**
 * DeckCollectMoment — the "cards fly to the profile" beat at module
 * completion (Yoav 1.8.26). 3-5 cards from the module's deck fan out of the
 * chest in an arc, hold a beat, then fly to the profile banner (top-RIGHT
 * corner — GlobalWealthHeader's tokenRow is LTR `row` and the profile chip is
 * its last child) while scaling down + fading. A small toast confirms
 * "החפיסה נוספה לאוסף".
 *
 * Pure presentation: no store writes, no events (collectDeck fires
 * `deck_collected` — and NEVER `chest_opened`). The host mounts it after the
 * chest ceremony and unmounts on onDone.
 *
 * Perf: transform/opacity only (60fps, UI thread); useReducedMotion skips
 * the flight entirely — toast only, quick onDone.
 */

interface Props {
  moduleId: string;
  onDone: () => void;
}

const MAX_FLIGHT_CARDS = 5;
const CARD_SIZE = 88;

// Timeline (ms)
const SPREAD_STAGGER = 70;
const FLY_START = 1050;
const FLY_STAGGER = 60;
const FLY_DURATION = 520;
const TOAST_IN = 1500;
const TOAST_HOLD = 1400;
const DONE_AT = TOAST_IN + TOAST_HOLD + 350;
const REDUCED_DONE_AT = 1200;

export function DeckCollectMoment({ moduleId, onDone }: Props) {
  const reducedMotion = useReducedMotion();
  const cards = useMemo(() => getDeckForModule(moduleId).slice(0, MAX_FLIGHT_CARDS), [moduleId]);

  // Keep the latest onDone without re-arming the timeline effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const toastOpacity = useSharedValue(0);

  useEffect(() => {
    if (cards.length === 0) {
      // No deck for this module — nothing to celebrate, hand back immediately.
      onDoneRef.current();
      return;
    }
    const toastDelay = reducedMotion ? 0 : TOAST_IN;
    toastOpacity.value = withDelay(toastDelay, withTiming(1, { duration: 220 }));
    toastOpacity.value = withDelay(
      toastDelay + TOAST_HOLD,
      withTiming(0, { duration: 250 }),
    );
    const doneTimer = setTimeout(
      () => onDoneRef.current(),
      reducedMotion ? REDUCED_DONE_AT : DONE_AT,
    );
    return () => clearTimeout(doneTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, reducedMotion]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: interpolate(toastOpacity.value, [0, 1], [10, 0]) }],
  }));

  if (cards.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Cards layer — anchored at screen center (the chest's position). */}
      {!reducedMotion && (
        <View style={styles.centerAnchor}>
          {cards.map((card, i) => (
            <FlyingCard key={card.cardId} card={card} index={i} count={cards.length} />
          ))}
        </View>
      )}

      {/* Confirmation toast — system voice, ≤6 words (BRAND.md). */}
      <Animated.View style={[styles.toastWrap, toastStyle]}>
        <View style={styles.toast}>
          <Text style={styles.toastText} allowFontScaling={false}>
            החפיסה נוספה לאוסף
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

function FlyingCard({ card, index, count }: { card: DeckCard; index: number; count: number }) {
  const { width, height } = useWindowDimensions();
  // 0 → 1: burst out of the chest into the fan position.
  const spread = useSharedValue(0);
  // 0 → 1: fan position → profile corner (top-right), scale-down + fade.
  const fly = useSharedValue(0);

  const offCenter = index - (count - 1) / 2;
  // Fan layout: horizontal spread + gentle upward arc + slight tilt.
  const fanX = offCenter * 62;
  const fanY = -46 + Math.abs(offCenter) * 14; // center card highest, edges dip
  const fanRotate = offCenter * 10;
  // Flight target: profile banner, top-right — relative to screen center.
  const targetX = width / 2 - 52;
  const targetY = -(height / 2) + 76;

  useEffect(() => {
    spread.value = withDelay(
      index * SPREAD_STAGGER,
      withSpring(1, { damping: 14, stiffness: 160 }),
    );
    fly.value = withDelay(
      FLY_START + index * FLY_STAGGER,
      withTiming(1, { duration: FLY_DURATION, easing: Easing.in(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const x = interpolate(spread.value, [0, 1], [0, fanX]) + fly.value * (targetX - fanX);
    const y = interpolate(spread.value, [0, 1], [0, fanY]) + fly.value * (targetY - fanY);
    const scale =
      interpolate(spread.value, [0, 1], [0.3, 1]) * interpolate(fly.value, [0, 1], [1, 0.18]);
    const rotate = interpolate(spread.value, [0, 1], [0, fanRotate]) * (1 - fly.value);
    return {
      opacity: Math.min(spread.value * 2, 1) * interpolate(fly.value, [0, 0.75, 1], [1, 0.9, 0]),
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, { zIndex: 10 - index }, style]}>
      <ExpoImage source={card.source} style={styles.cardImage} contentFit="cover" accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: CARD_SIZE,
    height: CARD_SIZE,
    marginLeft: -CARD_SIZE / 2,
    marginTop: -CARD_SIZE / 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#e0f2fe",
    overflow: "hidden",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  toastWrap: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.4)",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e0f2fe",
    writingDirection: "rtl",
  },
});
