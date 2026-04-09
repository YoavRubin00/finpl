/**
 * SkeletonLoader — pulsing shimmer placeholder for loading states.
 * PRD 29 US-002: Replaces ActivityIndicator spinners with smooth skeleton loaders.
 *
 * Usage:
 *   <SkeletonLoader width={200} height={20} borderRadius={8} />
 *   <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
 */
import React, { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface SkeletonLoaderProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(opacity);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animStyle,
        style,
      ]}
    />
  );
}

/** A row of skeleton lines — common pattern for text blocks. */
interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: `${number}%`;
  lineHeight?: number;
  gap?: number;
  style?: ViewStyle;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = 14,
  gap = 10,
  style,
}: SkeletonTextProps) {
  return (
    <Animated.View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          borderRadius={6}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(63, 63, 70, 0.6)',
  },
});
