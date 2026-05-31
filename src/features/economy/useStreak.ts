// src/features/economy/useStreak.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak, recordDailyActivity, type StreakState } from '../../lib/api/streak';
import { queryClient } from '../../lib/queryClient';
import { useEconomyUIStore } from './useEconomyUIStore';
import { useAuthStore } from '../auth/useAuthStore';
import { captureEvent } from '../../lib/posthog';

export const streakQueryKey = ['streak'] as const;

export function useStreak() {
  // Skip for guests — server streak is keyed off authId; guests use the local
  // useEconomyUIStore counter instead until they convert.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: streakQueryKey,
    queryFn: async () => (await getStreak()).streak,
    staleTime: 60_000,
    enabled: isAuthenticated && !isGuest,
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
 * Single entry point for "the user did a streak-eligible activity today".
 * Fires BOTH:
 *  1. Local `completeDailyTask` — updates activeDates (the in-app daily
 *     calendar/log) and the streak counter, which triggers the global
 *     `StreakCelebrationScreen` popup via useStreakCelebration's subscriber.
 *  2. Server `recordDailyActivity` — persists the streak day so cross-device
 *     state + scheduled notifications (e.g. "📉 יומיים בלי FinPlay") stay
 *     accurate.
 *
 * Both layers are idempotent — calling this multiple times on the same day
 * is a no-op for state (local early-returns if today is already recorded,
 * server dedups by date_il).
 *
 * Call this from every activity that counts toward the daily streak: lesson
 * completion, pearl completion, financial tool usage, daily news challenge,
 * daily quest, etc. Consolidating in one helper means popup + log + sync
 * stay in sync without per-callsite drift.
 */
export function markDailyActivityCompleted(): void {
  // Local first: synchronous, drives the popup + activeDates calendar.
  try { useEconomyUIStore.getState().completeDailyTask(); } catch { /* non-fatal */ }
  // Server next: async, persists across devices + powers notifications.
  // Server is already idempotent per dateIl, so fire-and-forget is safe.
  void recordDailyActivity(todayIsraelDate())
    .then(async (res) => {
      queryClient.setQueryData<StreakState | null>(streakQueryKey, res.streak);
      // Fire `daily_active_day` exactly once per Israeli calendar day so
      // NSM Secondary (Active Streaks) becomes a direct PostHog query
      // instead of a server-side join. Guarded by STREAK_DAILY_TICK_KEY:
      // if today's key was already written we've already fired today.
      try {
        const last = await AsyncStorage.getItem(STREAK_DAILY_TICK_KEY);
        const today = todayIsraelDate();
        if (last !== today) {
          captureEvent('daily_active_day', {
            date_il: today,
            streak: res.streak?.currentStreak ?? 0,
            longest_streak: res.streak?.longestStreak ?? 0,
          });
        }
      } catch { /* non-fatal */ }
      AsyncStorage.setItem(STREAK_DAILY_TICK_KEY, todayIsraelDate()).catch(() => {});
    })
    .catch(() => { /* offline / 401, local state stays correct, server retries on next foreground */ });
}

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
