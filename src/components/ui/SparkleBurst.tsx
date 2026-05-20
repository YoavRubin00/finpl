/**
 * SparkleBurst — full-screen confetti-style overlay for purchase success
 * and other "ding!" moments. Uses the curated 6 sparkle SVGs.
 *
 * Pattern: Hay Day "coins flying to wallet" — short (≈900ms), satisfying,
 * non-blocking (pointerEvents: none). Auto-dismisses; caller flips `visible`
 * back to `false` via the `onComplete` callback.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  Sparkle4Pt,
  Star5Pt,
  BurstLines,
  DotCluster,
  HeartPop,
  PlusBurst,
} from '../svg/shop/Sparkles';

const { width: W, height: H } = Dimensions.get('window');

interface ParticleSpec {
  Comp: React.FC<{ size?: number }>;
  startX: number;     // % of screen width
  startY: number;     // % of screen height
  travelX: number;    // px to drift horizontally
  travelY: number;    // px to drift vertically (negative = up)
  size: number;
  delay: number;      // ms before animation starts
  rotation: number;   // final rotation in degrees
}

// Hand-tuned positions to bias toward the upper half (where users are looking
// after a tap on a buy button) with a few accents at the edges.
const PARTICLES: readonly ParticleSpec[] = [
  { Comp: Star5Pt,    startX: 0.50, startY: 0.45, travelX: -8,  travelY: -120, size: 36, delay: 0,   rotation: -15 },
  { Comp: Sparkle4Pt, startX: 0.30, startY: 0.50, travelX: -40, travelY: -80,  size: 26, delay: 80,  rotation: 25 },
  { Comp: PlusBurst,  startX: 0.70, startY: 0.50, travelX: 40,  travelY: -90,  size: 28, delay: 120, rotation: -20 },
  { Comp: BurstLines, startX: 0.20, startY: 0.40, travelX: -20, travelY: -60,  size: 32, delay: 200, rotation: 0 },
  { Comp: DotCluster, startX: 0.80, startY: 0.40, travelX: 30,  travelY: -100, size: 30, delay: 180, rotation: 12 },
  { Comp: HeartPop,   startX: 0.55, startY: 0.55, travelX: 8,   travelY: -50,  size: 22, delay: 60,  rotation: 8 },
  { Comp: Sparkle4Pt, startX: 0.40, startY: 0.35, travelX: -10, travelY: -70,  size: 18, delay: 240, rotation: -8 },
  { Comp: Star5Pt,    startX: 0.65, startY: 0.35, travelX: 18,  travelY: -75,  size: 20, delay: 280, rotation: 18 },
];

interface ParticleProps {
  spec: ParticleSpec;
  trigger: number;       // monotonically increasing key — re-runs the animation
  reducedMotion: boolean;
}

function Particle({ spec, trigger, reducedMotion }: ParticleProps) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(400, withTiming(0, { duration: 250 })),
      );
      return;
    }
    opacity.value = withSequence(
      withDelay(spec.delay, withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })),
      withDelay(350, withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) })),
    );
    tx.value = withDelay(spec.delay, withTiming(spec.travelX, { duration: 900, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(spec.delay, withTiming(spec.travelY, { duration: 900, easing: Easing.out(Easing.quad) }));
    scale.value = withSequence(
      withDelay(spec.delay, withTiming(1.1, { duration: 220, easing: Easing.out(Easing.back(1.7)) })),
      withDelay(380, withTiming(0.85, { duration: 380 })),
    );
    rot.value = withDelay(spec.delay, withTiming(spec.rotation, { duration: 900 }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(scale);
      cancelAnimation(rot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  const left = spec.startX * W - spec.size / 2;
  const top = spec.startY * H - spec.size / 2;

  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: spec.size, height: spec.size }, animStyle]} pointerEvents="none">
      <spec.Comp size={spec.size} />
    </Animated.View>
  );
}

interface Props {
  /** When this number changes, the burst re-fires. Use Date.now() on each trigger. */
  trigger: number;
}

export function SparkleBurst({ trigger }: Props) {
  const reducedMotion = useReducedMotion();
  if (trigger === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((spec, i) => (
        <Particle key={`${trigger}-${i}`} spec={spec} trigger={trigger} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}
