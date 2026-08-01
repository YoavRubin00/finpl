import { useEffect, useState } from "react";
import { useSharedValue, useAnimatedReaction, withDelay, withTiming, runOnJS } from "react-native-reanimated";
import { COUNTER_TIMING } from "../tokens";

/** Formats a number the same way every counting visual displays it. */
export function formatCount(n: number, grouping: boolean): string {
  const rounded = Math.round(n);
  return grouping ? rounded.toLocaleString("he-IL") : String(rounded);
}

interface UseCountUpOptions {
  animate: boolean;
  /** ms to wait before the count-up starts. */
  delayMs?: number;
  /** Explicit duration; otherwise derived from the magnitude of the jump. */
  durationMs?: number;
  grouping?: boolean;
  from?: number;
}

/**
 * Shared "number races to its value" primitive — accelerate-then-decelerate
 * easing (Yoav 1.8: "מונה שמאיץ-ומאט"), UI-thread driven, JS display state
 * only touched when the rounded integer actually changes.
 */
export function useCountUp(target: number, options: UseCountUpOptions): string {
  const { animate, delayMs = 0, durationMs, grouping = true, from = 0 } = options;
  const startValue = animate ? from : target;
  const animated = useSharedValue(startValue);
  const [display, setDisplay] = useState(() => formatCount(startValue, grouping));

  const delta = Math.abs(target - from);
  const duration = durationMs ?? Math.min(1400, Math.max(650, 500 + delta * 0.6));

  useEffect(() => {
    if (!animate) {
      setDisplay(formatCount(target, grouping));
      return;
    }
    animated.value = withDelay(delayMs, withTiming(target, COUNTER_TIMING(duration)));
    // Runs once per mount, by design — this counter counts up exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimatedReaction(
    () => Math.round(animated.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(commit)(current);
      }
    },
    [grouping],
  );

  function commit(current: number) {
    setDisplay(formatCount(current, grouping));
  }

  return display;
}
