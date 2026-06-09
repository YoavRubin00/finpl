import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

/**
 * Tree-of-Wealth — 8 stages extracted from
 * `assets/video/WhatsApp Video 2026-05-02 at 01.30.08.mp4` via ffmpeg
 * (1.142fps × 7s). Each stage is a frame in the gold-tree growth arc:
 * stage 1 = seed + watering can, stage 8 = full canopy with golden fruit.
 *
 * The component owns one shared value (`progress`) that maps a 0-100
 * completion percentage to a continuous stage cursor (0..7). On change,
 * the next-stage frame crossfades over the previous one and the previous
 * stage is unmounted at the end of the transition. Crossfade is preferred
 * over snap-cut because partial-completion (e.g. 35%, between stages 2 and
 * 3) reads better as a smooth blend than a jump.
 */

// One require per stage so Metro can dedup if multiple GrowingTrees mount
// (e.g. multiple modules expanded at once — currently impossible per
// product spec, but cheap insurance).
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

interface GrowingTreeProps {
  /** 0-100. The tree's visible stage is interpolated against STAGE_COUNT. */
  progressPct: number;
  /** Square render size in DIP. Component is 1:1 to match the source frames. */
  size?: number;
  style?: ViewStyle;
}

/** Map percentage to a continuous stage cursor (0-indexed, 0 to 7). */
function stageCursor(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  // Even at 0%, render stage 1 (the seed) — never a blank frame. At 100%,
  // render stage 8.
  return (clamped / 100) * (STAGE_COUNT - 1);
}

export const GrowingTree = React.memo(function GrowingTree({
  progressPct,
  size = 220,
  style,
}: GrowingTreeProps): React.ReactElement {
  const reduceMotion = useReducedMotion();

  const cursor = useMemo(() => stageCursor(progressPct), [progressPct]);
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
        // Cache aggressively — the same 8 frames mount and unmount many
        // times across a session as users open/close the topic tree.
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
    // Hosts crossfading absolute layers — no padding/margin/background.
    // The parent decides framing.
  },
});
