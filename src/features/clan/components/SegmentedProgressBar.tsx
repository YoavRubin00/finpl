import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Segment {
  value: number;   // 0..1 of total
  color: string;
}

interface SegmentedProgressBarProps {
  segments: Segment[];
  height?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

export function SegmentedProgressBar({
  segments,
  height = 10,
  borderRadius = 6,
  backgroundColor = 'rgba(255,255,255,0.12)',
}: SegmentedProgressBarProps): React.ReactElement {
  const totalFill = Math.min(1, segments.reduce((sum, s) => sum + s.value, 0));

  return (
    <View
      style={{
        height,
        borderRadius,
        backgroundColor,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      {segments.map((seg, i) => (
        <AnimatedSegment key={i} segment={seg} height={height} />
      ))}
    </View>
  );
}

function AnimatedSegment({
  segment,
  height,
}: {
  segment: Segment;
  height: number;
}): React.ReactElement {
  const animStyle = useAnimatedStyle(() => ({
    width: `${withSpring(segment.value * 100, { damping: 14, stiffness: 120 })}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: segment.color,
        },
        animStyle,
      ]}
    />
  );
}
