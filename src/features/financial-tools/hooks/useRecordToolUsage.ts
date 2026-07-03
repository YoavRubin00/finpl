import { useEffect, useRef } from 'react';
import { markDailyActivityCompleted } from '../../economy/useStreak';
import { requestGuestGate } from '../../auth/guestValueGate';
import { captureEvent } from '../../../lib/posthog';

/**
 * Records today as a streak day when the user spends >10s inside a financial
 * tool. Mirrors the Duolingo "Stories to streak" fix that gave utility moments
 * credit toward the daily habit identity. Idempotent: the helper no-ops if
 * today is already recorded.
 *
 * Mount inside ToolHeader so every tool inherits the behavior with zero per
 * tool wiring. The 10s threshold filters out accidental opens and bounce
 * traffic; only meaningful time on tool earns a streak day, while still
 * letting fast skim users (compound calc, salary calc) earn credit.
 *
 * Uses the unified markDailyActivityCompleted() so the user gets the
 * StreakCelebrationScreen popup + activeDates calendar mark just like a
 * lesson, pearl, DNC, or daily quest completion would.
 *
 * Also fires `tool_used` (NSM Primary input) so Modules per active user per
 * week can be measured. Without this event the NSM denominator works but the
 * numerator misses every tool engagement.
 */
export function useRecordToolUsage(enabled: boolean, toolKey?: string): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      markDailyActivityCompleted();
      try { captureEvent('tool_used', { tool_key: toolKey ?? 'unknown', threshold_seconds: 10 }); } catch { /* non-fatal */ }
    }, 10_000);
    return () => {
      clearTimeout(timer);
      // Guest value-gate policy (Yoav 2026-07-03): meaningful tool use is a
      // completed value action — gate when the user LEAVES the tool (unmount),
      // never mid-use. Self-guarded (guest-only + 2-min cooldown).
      if (firedRef.current) requestGuestGate('tool_used');
    };
  }, [enabled, toolKey]);
}
