import { useCallback, useEffect } from "react";
import { Easing, cancelAnimation, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { successHaptic, tapHaptic } from "../../../../utils/haptics";
import { FADE_MS, HOLD_MS } from "./flowTimeline";

interface RoundClockOptions {
  animate: boolean;
  /** ms: the finished frame. */
  endMs: number;
  /** ms to wait after mount before the first round. */
  startDelayMs: number;
  /** ms into the round when the story lands (one haptic, first round only). */
  payoffAt: number;
  /** A good ending gets the success haptic; a warning gets a light tap. */
  payoffIsGood: boolean;
}

/**
 * The one clock of a living visual, in ms, on the UI thread.
 * A round builds to `endMs`, holds, fades back to empty, builds once more
 * and stays on the finished frame. `replay` starts over. With `animate`
 * false (reduced motion) the clock sits on the finished frame.
 */
export function useRoundClock({ animate, endMs, startDelayMs, payoffAt, payoffIsGood }: RoundClockOptions): {
  clock: SharedValue<number>;
  replay: () => void;
} {
  const clock = useSharedValue(animate ? 0 : endMs);

  const play = useCallback(
    (delayMs: number) => {
      cancelAnimation(clock);
      clock.value = 0;
      const round = endMs + HOLD_MS + FADE_MS;
      clock.value = withDelay(
        delayMs,
        withSequence(
          withTiming(round, { duration: round, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
          withTiming(endMs, { duration: endMs, easing: Easing.linear }),
        ),
      );
    },
    [clock, endMs],
  );

  useEffect(() => {
    if (!animate) {
      clock.value = endMs;
      return;
    }
    play(startDelayMs);
    const timer = setTimeout(() => {
      if (payoffIsGood) successHaptic();
      else tapHaptic();
    }, startDelayMs + payoffAt);
    return () => {
      clearTimeout(timer);
      cancelAnimation(clock);
    };
    // Runs once per mount: a visual starts itself exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replay = useCallback(() => {
    tapHaptic();
    play(0);
  }, [play]);

  return { clock, replay };
}
