import { useEffect, useRef } from 'react';
import { useRecordDailyActivity } from '../../economy/useStreak';

/**
 * Records today as a streak day when the user spends >30s inside a financial
 * tool — mirroring the Duolingo "Stories → streak" fix that gave utility
 * moments credit toward the daily-habit identity. Idempotent: the streak API
 * no-ops if today is already recorded.
 *
 * Mount inside `ToolHeader` so every tool inherits the behavior with zero
 * per-tool wiring. The 30s threshold filters out accidental opens and bounce
 * traffic — only meaningful time-on-tool earns a streak day.
 */
export function useRecordToolUsage(enabled: boolean): void {
  const { mutate } = useRecordDailyActivity();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      mutate();
    }, 30_000);
    return () => clearTimeout(timer);
  }, [enabled, mutate]);
}
