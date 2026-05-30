import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface CountUpNumberProps {
  /** Target value. Mount counts from 0 → value; later updates count smoothly
   *  from the previously-shown number → new value. */
  value: number;
  /** Formatter for the displayed string (e.g. `formatShekel`). */
  format: (n: number) => string;
  /** Animation duration. Defaults to 900ms (Hub Hero) — tool result heroes
   *  often want a slightly punchier 700ms. */
  durationMs?: number;
  style?: TextStyle | TextStyle[];
  /** Optional override of the starting value. Defaults to 0 on first mount. */
  startFrom?: number;
}

/**
 * Counts up to `value` over `durationMs` so a result number feels earned
 * instead of instantly materialised. Drives every "big number" moment in
 * the Financial Tools: Hub Hero net-worth, StatHero result reveal, etc.
 *
 * Internally bridges a Reanimated shared value to React state via
 * `useAnimatedReaction` + `runOnJS` so the formatter (locale shekel,
 * percent, etc.) can stay on the JS side.
 */
export function CountUpNumber({
  value,
  format,
  durationMs = 900,
  style,
  startFrom = 0,
}: CountUpNumberProps): React.ReactElement {
  const animated = useSharedValue(startFrom);
  const [display, setDisplay] = useState(format(startFrom));

  useEffect(() => {
    animated.value = withTiming(value, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, durationMs, animated]);

  useAnimatedReaction(
    () => Math.round(animated.value),
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setDisplay)(format(current));
      }
    },
    [],
  );

  return <Animated.Text style={style}>{display}</Animated.Text>;
}
