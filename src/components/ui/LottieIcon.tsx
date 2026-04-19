import { useEffect, useRef } from 'react';
import { type ViewStyle } from 'react-native';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';

interface LottieIconProps {
  source: AnimationObject | { uri: string } | string | number;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: ViewStyle;
  /** When false, animation is paused (saves CPU when off-screen). Default true. */
  active?: boolean;
  /** Accessibility label for screen readers, תקן נגישות ישראלי */
  accessibilityLabel?: string;
}

export function LottieIcon({ source, size = 28, autoPlay = true, loop = true, speed, style, active = true, accessibilityLabel }: LottieIconProps) {
  // require() returns number in RN, cast for LottieView compatibility
  const resolvedSource = source as AnimationObject | { uri: string } | string;
  const effectiveAutoPlay = autoPlay && active;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (!lottieRef.current) return;
    if (active) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [active]);

  const lottie = (
    <LottieView
      ref={lottieRef}
      source={resolvedSource}
      style={{ width: size, height: size }}
      autoPlay={effectiveAutoPlay}
      loop={loop}
      speed={speed}
      renderMode="SOFTWARE"
    />
  );
  return (
    <View
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {lottie}
    </View>
  );
}
