/**
 * Finn Notification Scheduler, orchestrates context-aware push notifications.
 * Called from useNotificationSetup. Runs once per day on app open.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationStore } from './useNotificationStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from '../economy/useEconomy';
import { streakQueryKey } from '../economy/useStreak';
import type { Economy } from '../../lib/api/economy';
import type { StreakState } from '../../lib/api/streak';
import { useAuthStore } from '../auth/useAuthStore';
import { getLevelFromXP } from '../../utils/progression';
import {
    buildStreakContext,
    selectStreakCopyTier,
    getStreakCopyForGoal,
    getToneFromGoal,
    getMorningCopy,
    buildInactivityEscalation,
    pickFinnCopy,
} from './finnNotificationCopy';
import { getIsraelDateISO } from '../../utils/israelTime';


/** US-007: personalized send hour from recent activity pattern.
 *  Returns hour-of-day (0-23).
 *  <7 samples (new user): anchor to the MOST RECENT activity hour — on day 0
 *  that's the install/first-session hour, the strongest same-time-tomorrow
 *  habit anchor available (RETENTION-PLAN 2026-07-02 §2.2). The old flat-20
 *  fallback sent every new user a generic evening push regardless of when
 *  they actually use the app. No samples at all → 20. */
function computePersonalizedHour(recentHours: number[]): number {
    if (recentHours.length === 0) return 20;
    if (recentHours.length < 7) {
        const mostRecent = recentHours[recentHours.length - 1];
        return Math.max(8, Math.min(22, Math.round(mostRecent) - 1));
    }
    const avg = recentHours.reduce((a, b) => a + b, 0) / recentHours.length;
    // Schedule 2h before the habit window, clamp to a sane evening range (8-22)
    const target = Math.round(avg) - 2;
    return Math.max(8, Math.min(22, target));
}

/** Hard cap: cancel any OS-scheduled notifications beyond `maxAllowed`. */
async function enforceNotificationCap(maxAllowed: number): Promise<void> {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    if (all.length <= maxAllowed) return;
    const excess = all.slice(maxAllowed);
    await Promise.all(excess.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export function useFinnNotificationScheduler() {
    const permissionGranted = useNotificationStore((s) => s.permissionGranted);
    const preferences = useNotificationStore((s) => s.preferences);
    const lastScheduledDate = useNotificationStore((s) => s.lastScheduledDate);
    const lastFinnCopyTitle = useNotificationStore((s) => s.lastFinnCopyTitle);
    // R8 T3.3 — react to today's task completion by canceling any pending
    // 23:00 fallback push. Watcher is keyed on lastDailyTaskDate so as
    // soon as the user logs a session it fires.
    const lastDailyTaskDate = useEconomyUIStore((s) => s.lastDailyTaskDate);
    useEffect(() => {
        if (!permissionGranted) return;
        if (lastDailyTaskDate !== getIsraelDateISO()) return;
        useNotificationStore.getState().cancelChannel('streakFallback').catch(() => { /* non-fatal */ });
    }, [permissionGranted, lastDailyTaskDate]);

    useEffect(() => {
        if (!permissionGranted) return;

        const today = getIsraelDateISO();
        if (lastScheduledDate === today) return; // already scheduled today

        // Mark scheduled immediately to prevent re-entry if deps change mid-run
        useNotificationStore.getState().setLastScheduledDate(today);

        (async () => {
            try {
                const uiState = useEconomyUIStore.getState();
                const cachedEco = queryClient.getQueryData<Economy | null>(economyQueryKey);
                const cachedStreak = queryClient.getQueryData<StreakState | null>(streakQueryKey);
                const economyCompat = {
                  xp: cachedEco?.xp ?? 0,
                  streak: cachedStreak?.currentStreak ?? 0,
                  lastDailyTaskDate: uiState.lastDailyTaskDate,
                  recentActivityHours: uiState.recentActivityHours,
                };
                const level = getLevelFromXP(economyCompat.xp);
                const ctx = buildStreakContext(economyCompat as Parameters<typeof buildStreakContext>[0], level);
                const store = useNotificationStore.getState();

                // US-007: personalized send hour from recent activity pattern.
                // An explicit appointment hour picked in the permission primer
                // ("מתי להזכיר?") beats the inferred habit hour.
                const primaryHour = store.preferredReminderHour
                    ?? computePersonalizedHour(uiState.recentActivityHours ?? []);

                // US-008: tone adapted to user's onboarding daily-goal answer
                const goalMinutes = useAuthStore.getState().profile?.dailyGoalMinutes;
                const tone = getToneFromGoal(typeof goalMinutes === 'number' ? goalMinutes : null);

                // ── Await cancel before scheduling anything, prevents race condition ──
                await Notifications.cancelAllScheduledNotificationsAsync();

                // ── At most 2 notifications per day, scheduled sequentially ──
                // Priority: inactivity (urgent) > streak at-risk > morning motivation
                if (preferences.inactivity && ctx.daysSinceActive >= 1) {
                    const escalation = buildInactivityEscalation(lastFinnCopyTitle).slice(0, 1);
                    await store.scheduleInactivityEscalation(escalation);
                    store.setLastFinnCopyTitle(escalation[0]?.content.title ?? null);

                } else if (preferences.streak) {
                    const tier = selectStreakCopyTier(ctx);
                    const pool = getStreakCopyForGoal(tier, tone);
                    const copy = pickFinnCopy(pool, lastFinnCopyTitle);

                    // Primary reminder at personalised hour
                    await store.scheduleStreakReminderWithCopy(
                        { title: copy.title, body: copy.body, data: { screen: '/(tabs)/learn' } },
                        primaryHour,
                    );
                    store.setLastFinnCopyTitle(copy.title);

                    // R8 T3.3 — US-009: 23:00 fallback on its OWN channel
                    // (`streakFallback`) so it doesn't overwrite the primary
                    // streak reminder scheduled above. Watcher below cancels
                    // this when the user logs a session same-day.
                    if (economyCompat.lastDailyTaskDate !== today && primaryHour < 23) {
                        const streakDays = economyCompat.streak;
                        // CALM theme: emoji-free titles (matches 2026-05-30 push copy audit).
                        const fallbackCopy = streakDays > 0
                            ? { title: `רצף של ${streakDays} ימים בסכנה`, body: 'שעה אחרונה לשמור עליו. 2 דקות וזהו.' }
                            : { title: 'שעה אחרונה ליום', body: 'לא מאוחר מדי להתחיל רצף חדש היום.' };
                        await store.scheduleStreakFallbackWithCopy(
                            { title: fallbackCopy.title, body: fallbackCopy.body, data: { screen: '/(tabs)/learn' } },
                            23,
                        );
                    }

                } else if (preferences.morning) {
                    const copy = pickFinnCopy(getMorningCopy(), lastFinnCopyTitle);
                    await store.scheduleMorningMotivation(
                        { title: copy.title, body: copy.body, data: { screen: '/(tabs)/learn' } },
                    );
                    store.setLastFinnCopyTitle(copy.title);
                }

                // Tool-of-the-day is now an IN-APP top banner (ToolsDiscoveryBanner
                // on the home screen), not an OS push (Yoav 18/06: keep it in-app).

                // Safety net: never leave more than 2 notifications scheduled
                await enforceNotificationCap(2);

            } catch { /* scheduler must never crash the app */ }
        })();
    }, [permissionGranted, preferences, lastScheduledDate, lastFinnCopyTitle]);
}
