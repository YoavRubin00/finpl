import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  type WithSpringConfig,
  type WithTimingConfig,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

export const SPRING_BOUNCY: WithSpringConfig = {
  damping: 16,
  stiffness: 150,
};

export const SPRING_SMOOTH: WithSpringConfig = {
  damping: 20,
  stiffness: 120,
};

export const SPRING_SNAPPY: WithSpringConfig = {
  damping: 15,
  stiffness: 200,
};

// ---------------------------------------------------------------------------
// Timing presets
// ---------------------------------------------------------------------------

export const TIMING_FAST: WithTimingConfig = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

export const TIMING_NORMAL: WithTimingConfig = {
  duration: 350,
  easing: Easing.out(Easing.cubic),
};

export const TIMING_SLOW: WithTimingConfig = {
  duration: 500,
  easing: Easing.out(Easing.cubic),
};

// ---------------------------------------------------------------------------
// Entrance animation configs
// ---------------------------------------------------------------------------

export interface EntranceConfig {
  /** Initial translateY offset (px). Default 30. */
  translateY?: number;
  /** Initial translateX offset (px). Default 0. */
  translateX?: number;
  /** Initial scale. Default 1. */
  scale?: number;
  /** Initial opacity. Default 0. */
  opacity?: number;
  /** Delay before animation starts (ms). Default 0. */
  delay?: number;
  /** Spring config to use. Default SPRING_SMOOTH. */
  spring?: WithSpringConfig;
}

/** Fade in while sliding up. */
export const fadeInUp: EntranceConfig = {
  translateY: 30,
  opacity: 0,
};

/** Fade in while scaling from 0.8. */
export const fadeInScale: EntranceConfig = {
  scale: 0.8,
  opacity: 0,
};

/** Slide in from the left. */
export const slideInLeft: EntranceConfig = {
  translateX: -60,
  opacity: 0,
};

/** Slide in from the right. */
export const slideInRight: EntranceConfig = {
  translateX: 60,
  opacity: 0,
};

// ---------------------------------------------------------------------------
// useEntranceAnimation hook
// ---------------------------------------------------------------------------

/**
 * Returns an animated style that transitions from the entrance config to the
 * resting state on mount. Useful for staggered screen-entrance effects.
 *
 * @example
 * const style = useEntranceAnimation(fadeInUp, { delay: 100 });
 * <Animated.View style={style}>…</Animated.View>
 */
export function useEntranceAnimation(
  config: EntranceConfig = fadeInUp,
  overrides?: Pick<EntranceConfig, "delay" | "spring">,
) {
  const {
    translateY: initY = 0,
    translateX: initX = 0,
    scale: initScale = 1,
    opacity: initOpacity = 0,
    delay: configDelay = 0,
    spring: configSpring = SPRING_SMOOTH,
  } = { ...config, ...overrides };

  const delay = overrides?.delay ?? configDelay;
  const spring = overrides?.spring ?? configSpring;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(1, spring));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: initOpacity + (1 - initOpacity) * p,
      transform: [
        { translateY: initY * (1 - p) },
        { translateX: initX * (1 - p) },
        { scale: initScale + (1 - initScale) * p },
      ],
    };
  });

  return animatedStyle;
}
