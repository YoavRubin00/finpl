import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

interface PearlProgressBarProps {
  /** Total number of stages (e.g., 2 for video+game, 3 for chapter-0 with profile question). */
  total: number;
  /** Zero-indexed currently-active stage. */
  current: number;
}

/**
 * Compact stage indicator for the Pearl sheet — circles connected by short
 * bars. Past stages are filled-green with a check, current is filled-blue
 * with a soft pulse, future stages are outline-gray. The bar between any two
 * stages is filled-green only if the LEFT-side stage is completed.
 */
export function PearlProgressBar({ total, current }: PearlProgressBarProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [reducedMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View
      style={{
        flexDirection: 'row-reverse', // RTL: progress fills right→left visually
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        paddingVertical: 4,
      }}
      accessibilityLabel={`שלב ${current + 1} מתוך ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current;
        const isCurrent = i === current;

        const dotColor = isDone ? '#16a34a' : isCurrent ? '#0ea5e9' : '#e5e7eb';
        const dotBorder = isDone ? '#16a34a' : isCurrent ? '#0284c7' : '#cbd5e1';

        const dot = (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: dotColor,
              borderWidth: 2,
              borderColor: dotBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDone ? <Check size={12} color="#fff" strokeWidth={3.5} /> : null}
          </View>
        );

        return (
          <React.Fragment key={i}>
            {isCurrent ? (
              <Animated.View style={pulseStyle}>{dot}</Animated.View>
            ) : (
              dot
            )}
            {i < total - 1 ? (
              <View
                style={{
                  width: 28,
                  height: 4,
                  backgroundColor: isDone ? '#16a34a' : '#e5e7eb',
                  marginHorizontal: 4,
                  borderRadius: 2,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}
