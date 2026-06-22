import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

/**
 * GrowingTree — 8-stage gold-tree growth arc (stage 1 = seed + watering can,
 * stage 8 = full canopy with golden fruit). Frames live in
 * `assets/IMAGES/tree-growth/stage-1..8.png`.
 *
 * Revived from the retired topic-tree GrowingTree (removed in R5.10 — Yoav:
 * "it doesn't fit" — for the MODULE screen). Repurposed here for the profile
 * "עץ הידע" (Knowledge Tree) retention mechanic, a context that does fit:
 * the tree grows one stage per day the user performs a value action.
 *
 * Driven by a discrete `stageIndex` (1..8) — the Knowledge Tree advances in
 * whole-day steps, so a discrete stage reads cleaner than the original
 * continuous percentage. On change, the next-stage frame crossfades over the
 * previous one (snap-cut under reduced motion). `progressPct` is kept as a
 * fallback for any 0-100 caller.
 */

// One require per stage so Metro can dedup if multiple instances mount.
const STAGES = [
  require('../../../../assets/IMAGES/tree-growth/stage-1.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-2.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-3.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-4.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-5.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-6.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-7.png'),
  require('../../../../assets/IMAGES/tree-growth/stage-8.png'),
] as const;

const STAGE_COUNT = STAGES.length;
const TRANSITION_MS = 700;

/** Static frame source for a given stage (1..8) — for thumbnails / previews
 *  that don't need the crossfade (e.g. the profile card). */
export function treeStageSource(stage: number): ImageSource {
  const idx = Math.max(0, Math.min(STAGE_COUNT - 1, Math.round(stage) - 1));
  return STAGES[idx];
}

interface GrowingTreeProps {
  /** Discrete stage 1..8 (preferred). Clamped to [1, 8]. */
  stageIndex?: number;
  /** 0-100 fallback, used only when `stageIndex` is not provided. */
  progressPct?: number;
  /** Square render size in DIP. Component is 1:1 to match the source frames. */
  size?: number;
  style?: ViewStyle;
}

/** Map percentage to a continuous stage cursor (0-indexed, 0 to 7). */
function stageCursor(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  return (clamped / 100) * (STAGE_COUNT - 1);
}

export const GrowingTree = React.memo(function GrowingTree({
  stageIndex,
  progressPct,
  size = 220,
  style,
}: GrowingTreeProps): React.ReactElement {
  const reduceMotion = useReducedMotion();

  const cursor = useMemo(() => {
    if (stageIndex != null) {
      // Clamp to a valid 1..8 stage, then to a 0..7 index.
      const s = Math.max(1, Math.min(STAGE_COUNT, Math.round(stageIndex)));
      return s - 1;
    }
    return stageCursor(progressPct ?? 0);
  }, [stageIndex, progressPct]);

  const targetIdx = Math.round(cursor);
  // Track previous to crossfade FROM. On first mount, both are the same so
  // no transition fires.
  const prevIdxRef = useRef(targetIdx);
  const fade = useSharedValue(1);

  useEffect(() => {
    const prevIdx = prevIdxRef.current;
    if (prevIdx === targetIdx) return;
    // Fade fresh layer in. Reduced-motion users get a snap-cut.
    fade.value = 0;
    fade.value = withTiming(1, {
      duration: reduceMotion ? 0 : TRANSITION_MS,
      easing: Easing.out(Easing.quad),
    });
    prevIdxRef.current = targetIdx;
  }, [targetIdx, fade, reduceMotion]);

  const topStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const bottomImage = STAGES[Math.max(0, Math.min(STAGE_COUNT - 1, prevIdxRef.current))];
  const topImage = STAGES[Math.max(0, Math.min(STAGE_COUNT - 1, targetIdx))];

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} accessible={false}>
      {/* Base layer = previous stage. Always visible. */}
      <ExpoImage
        source={bottomImage}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        cachePolicy="memory-disk"
        accessible={false}
      />
      {/* Top layer fades in to the new stage. */}
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]} pointerEvents="none">
        <ExpoImage
          source={topImage}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessible={false}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
});