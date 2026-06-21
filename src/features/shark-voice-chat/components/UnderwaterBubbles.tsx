import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

/**
 * Ambient drifting bubbles for the voice chat background. Renders ~14 bubbles
 * at randomized horizontal positions, sizes, opacities, and speeds. Each one
 * floats from below the screen up past the top and loops.
 *
 * Driven entirely by Reanimated worklets so it runs at 60fps on the UI thread
 * without re-rendering the React tree.
 */

interface BubbleProps {
  size: number;
  startX: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  screenHeight: number;
}

function Bubble({ size, startX, duration, delay, opacity, drift, screenHeight }: BubbleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        false,
      ),
    );
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => {
    const translateY = (1 - progress.value) * (screenHeight + size + 40) - size - 40;
    const swayPhase = Math.sin(progress.value * Math.PI * 2);
    const translateX = swayPhase * drift;
    const scale = 0.85 + progress.value * 0.25;
    const op = opacity * (1 - Math.max(0, progress.value - 0.85) * 6);
    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity: Math.max(0, op),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(186, 230, 253, 0.45)',
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.55)',
        },
        style,
      ]}
    >
      {/* Inner highlight — a small bright dot at the upper-left of the bubble */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          left: size * 0.22,
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size * 0.11,
          backgroundColor: 'rgba(255,255,255,0.85)',
        }}
      />
    </Animated.View>
  );
}

const BUBBLE_COUNT = 16;

function generateBubbles(screenWidth: number) {
  const bubbles: Omit<BubbleProps, 'screenHeight'>[] = [];
  for (let i = 0; i < BUBBLE_COUNT; i += 1) {
    const size = 8 + Math.random() * 36;
    bubbles.push({
      size,
      startX: Math.random() * (screenWidth - size),
      duration: 8000 + Math.random() * 9000,
      delay: Math.random() * 6000,
      opacity: 0.25 + Math.random() * 0.4,
      drift: 10 + Math.random() * 30,
    });
  }
  return bubbles;
}

export function UnderwaterBubbles(): React.ReactElement {
  const { width, height } = Dimensions.get('window');
  // Generate once per mount — randomness is locked in for the session
  const bubbles = React.useMemo(() => generateBubbles(width), [width]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {bubbles.map((b, i) => (
        <Bubble key={i} {...b} screenHeight={height} />
      ))}
    </View>
  );
}
