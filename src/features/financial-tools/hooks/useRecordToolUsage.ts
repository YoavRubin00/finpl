import { useEffect, useRef } from 'react';
import { markDailyActivityCompleted } from '../../economy/useStreak';

/**
 * Records today as a streak day when the user spends >10s inside a financial
 * tool — mirroring the Duolingo "Stories → streak" fix that gave utility
 * moments credit toward the daily-habit identity. Idempotent: the helper
 * no-ops if today is already recorded.
 *
 * Mount inside `ToolHeader` so every tool inherits the behavior with zero
 * per-tool wiring. The 10s threshold filters out accidental opens and bounce
 * traffic — only meaningful time-on-tool earns a streak day, while still
 * letting fast-skim users (compound calc, salary calc) earn credit.
 *
 * Uses the unified markDailyActivityCompleted() so the user gets the
 * StreakCelebrationScreen popup + activeDates calendar mark just like a
 * lesson, pearl, DNC, or daily quest completion would.
 */
export function useRecordToolUsage(enabled: boolean): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      markDailyActivityCompleted();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [enabled]);
}
