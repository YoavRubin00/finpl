import { useEffect, useRef } from 'react';
import { useStreak } from '../economy/useStreak';
import { useCosmeticsStore } from './useCosmeticsStore';

/**
 * R8 T3.5 — Streak watcher that drives the cosmetics loop.
 *
 * 1. **Crossing 7 days** (first time ever, lifetime): unlocks Gold + Fire
 *    skins so the picker modal can surface them. Idempotent — runs only
 *    once, gated on `hasSeen7DayPicker`.
 *
 * 2. **Streak break**: when the previous-known streak was ≥1 and the
 *    current streak drops to 0 (or below the previous value by ≥2 — a
 *    Streak Freeze save would only lose 1), revert to the classic skin
 *    AND wipe the unlocked Gold/Fire skins. The user can re-earn them
 *    by re-crossing 7 days OR re-buy at the rebuy price.
 *
 * Reads from the server streak query. For guests this returns
 * undefined → currentStreak stays 0 → no transitions fire (guests
 * don't have the streak/cosmetics loop until they convert).
 */
export function useStreakSkinWatcher(): void {
  const streakQuery = useStreak();
  // Only a *present* streak value drives transitions. When the query has no
  // data yet (cold mount) or transiently resets to undefined (error/refetch
  // /invalidation), `currentStreak` would fall back to 0 and look like a
  // drop to 0 — falsely firing a streak-break that wipes earned skins.
  const hasData = streakQuery.data != null;
  const currentStreak = streakQuery.data?.currentStreak ?? 0;

  const prevStreakRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasData) return; // no real value — don't infer a transition
    const prev = prevStreakRef.current;
    prevStreakRef.current = currentStreak;
    if (prev === null) return; // first known value, no transition

    // 1) Crossed 7 days — unlock cosmetics. Store handles idempotency.
    if (prev < 7 && currentStreak >= 7) {
      useCosmeticsStore.getState().unlockSevenDayRewards();
    }

    // 2) Streak break — revert to classic if user had a non-classic
    //    skin equipped. A drop by exactly 1 day is treated as a Streak
    //    Freeze save (no penalty); a drop to 0 OR a drop of ≥2 is a
    //    genuine break.
    const drop = prev - currentStreak;
    const isBreak = drop >= 2 || (prev > 0 && currentStreak === 0);
    if (isBreak) {
      useCosmeticsStore.getState().revertToClassic();
    }
  }, [hasData, currentStreak]);
}
