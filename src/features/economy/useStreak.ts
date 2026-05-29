// src/features/economy/useStreak.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak, recordDailyActivity, type StreakState } from '../../lib/api/streak';

export const streakQueryKey = ['streak'] as const;

export function useStreak() {
  return useQuery({
    queryKey: streakQueryKey,
    queryFn: async () => (await getStreak()).streak,
    staleTime: 60_000,
  });
}

export function todayIsraelDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

export function useRecordDailyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await recordDailyActivity(todayIsraelDate())).streak,
    onSuccess: (streak) => {
      qc.setQueryData<StreakState | null>(streakQueryKey, streak);
      // Mirror the daily-tick gate so an explicit completion (onboarding /
      // lesson) suppresses the next foreground's redundant POST the same day.
      AsyncStorage.setItem(STREAK_DAILY_TICK_KEY, todayIsraelDate()).catch(() => {});
    },
  });
}

/**
 * Persisted gate so we record at most one daily-activity POST per Israeli
 * calendar day, across cold starts and foregrounds. The server endpoint is
 * already idempotent per dateIl — this just spares us redundant network calls.
 */
export const STREAK_DAILY_TICK_KEY = 'streak-daily-tick:last';

/**
 * Fire `recordDailyActivity` once per Israeli calendar day on app open and on
 * every foreground transition. Without this the streak only advances when a
 * lesson or onboarding completes, so DAUs who play arena / feed / trading /
 * quizzes never accumulate a streak — the bug behind users stuck at 0.
 *
 * `enabled` should be the auth-ready signal: don't fire while bootstrapping
 * or signed-out.
 */
export function useStreakDailyTick(enabled: boolean): void {
  const recordMutation = useRecordDailyActivity();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async (): Promise<void> => {
      try {
        const today = todayIsraelDate();
        const last = await AsyncStorage.getItem(STREAK_DAILY_TICK_KEY);
        if (cancelled) return;
        if (last === today) return; // already recorded today
        // Mutation handles cache update + writing the gate key on success.
        recordMutation.mutate();
      } catch {
        // Non-fatal — next foreground retries.
      }
    };

    void tick();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void tick();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
    // recordMutation identity is stable across renders for this hook's lifetime;
    // depending on it would re-subscribe AppState needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
