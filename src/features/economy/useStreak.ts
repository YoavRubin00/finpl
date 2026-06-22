// src/features/economy/useStreak.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak, recordDailyActivity, type StreakState } from '../../lib/api/streak';
import { queryClient } from '../../lib/queryClient';
import { useEconomyUIStore } from './useEconomyUIStore';
import { useAuthStore } from '../auth/useAuthStore';
import { captureEvent, setPersonProperties } from '../../lib/posthog';
import { track } from '../../lib/analytics/events';
import { useKnowledgeTreeStore } from '../knowledge-tree/useKnowledgeTreeStore';

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
      // Snapshot the pre-update streak BEFORE overwriting the cache so the
      // shared emitter can detect a genuine streak extension.
      const prev = qc.getQueryData<StreakState | null>(streakQueryKey)?.currentStreak ?? 0;
      qc.setQueryData<StreakState | null>(streakQueryKey, streak);
      try {
        setPersonProperties({
          current_streak: streak?.currentStreak ?? 0,
          longest_streak: streak?.longestStreak ?? 0,
        });
      } catch { /* non-fatal */ }
      // Fire daily_active_day (+ streak_extended) from the app-open path — THIS
      // is the under-firing fix. emitDailyActivitySignals writes the gate key,
      // so the activity path dedups against it (exactly one emit per day).
      void emitDailyActivitySignals(streak, prev);
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
 * Emit the daily-activity analytics signals exactly ONCE per Israeli calendar
 * day, from whichever path records the day FIRST — the app-open tick
 * (useStreakDailyTick) or an in-app activity (markDailyActivityCompleted).
 *
 * Bug fix (Yoav 2026-06-21): `daily_active_day` used to fire ONLY from the
 * activity path, while the app-open tick wrote STREAK_DAILY_TICK_KEY WITHOUT
 * firing it. Since the tick runs on every foreground, it usually wrote the gate
 * key before the user did any activity, suppressing the event for ~70% of
 * active users (it sat at ~30% coverage vs Application Opened). Emitting here,
 * gated by the shared key, restores full coverage. `streak_extended` rides
 * along on the day's first record (the streak grows at most once/day, so the
 * key gate is correct), making BOTH events reliable for the PMF/retention
 * dashboards. Auth-only by design (server streak is keyed off authId; guests
 * are still captured by the reliable `Application Opened` event the dashboards
 * use).
 */
async function emitDailyActivitySignals(
  streak: StreakState | null | undefined,
  prevStreak: number,
): Promise<void> {
  const today = todayIsraelDate();
  let last: string | null = null;
  try { last = await AsyncStorage.getItem(STREAK_DAILY_TICK_KEY); } catch { /* treat as not-fired */ }
  if (last === today) return; // the other path already emitted today
  const newStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  try {
    captureEvent('daily_active_day', { date_il: today, streak: newStreak, longest_streak: longestStreak });
    if (newStreak > prevStreak) {
      const MILESTONES = new Set([2, 7, 14, 30, 100, 365]);
      track({
        name: 'streak_extended',
        props: {
          prev_streak: prevStreak,
          new_streak: newStreak,
          longest_streak: longestStreak,
          is_milestone: MILESTONES.has(newStreak),
          reached_two: prevStreak < 2 && newStreak >= 2,
        },
      });
    }
  } catch { /* non-fatal */ }
  AsyncStorage.setItem(STREAK_DAILY_TICK_KEY, today).catch(() => {});
}

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
  // Grow the profile "עץ הידע" (Knowledge Tree) — one watering per IL day.
  // Idempotent in the store, so firing on every value action is safe. This is
  // the value-action trigger (NOT the app-open tick), so the tree only grows
  // on real activity, exactly as intended.
  try { useKnowledgeTreeStore.getState().waterToday(); } catch { /* non-fatal */ }
  // Server next: async, persists across devices + powers notifications.
  // Server is already idempotent per dateIl, so fire-and-forget is safe.
  // Snapshot pre-call streak so we can detect a real "extension" after the
  // server tells us the new value (and not fire on a no-op same-day call).
  const prevSnapshot = queryClient.getQueryData<StreakState | null>(streakQueryKey);
  const prevStreakBefore = prevSnapshot?.currentStreak ?? 0;

  void recordDailyActivity(todayIsraelDate())
    .then((res) => {
      queryClient.setQueryData<StreakState | null>(streakQueryKey, res.streak);
      // Keep the PostHog person streak props fresh (incl. server resets to 1/0).
      try {
        setPersonProperties({
          current_streak: res.streak?.currentStreak ?? 0,
          longest_streak: res.streak?.longestStreak ?? 0,
        });
      } catch { /* non-fatal */ }
      // daily_active_day + streak_extended via the shared once-per-day emitter
      // (the app-open tick fires the same; whichever runs first wins and the
      // other dedups on STREAK_DAILY_TICK_KEY).
      void emitDailyActivitySignals(res.streak, prevStreakBefore);
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
