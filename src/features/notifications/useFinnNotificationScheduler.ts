/**
 * Finn Notification Scheduler, orchestrates context-aware push notifications.
 * Called from useNotificationSetup. Runs once per day on app open.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationStore } from './useNotificationStore';
import { useEconomyStore } from '../economy/useEconomyStore';
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

/** US-007: personalized send hour from recent activity pattern.
 *  Returns hour-of-day (0-23). Falls back to 20 if insufficient data (<7 entries). */
function computePersonalizedHour(recentHours: number[]): number {
    if (recentHours.length < 7) return 20;
    const avg = recentHours.reduce((a, b) => a + b, 0) / recentHours.length;
    // Schedule 2h before the habit window, clamp to a sane evening range (8-22)
    const target = Math.round(avg) - 2;
    return Math.max(8, Math.min(22, target));
}

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
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

    useEffect(() => {
        if (!permissionGranted) return;

        const today = todayISO();
        if (lastScheduledDate === today) return; // already scheduled today

        // Mark scheduled immediately to prevent re-entry if deps change mid-run
        useNotificationStore.getState().setLastScheduledDate(today);

        (async () => {
            try {
                const economy = useEconomyStore.getState();
                const level = getLevelFromXP(economy.xp);
                const ctx = buildStreakContext(economy, level);
                const store = useNotificationStore.getState();

                // US-007: personalized send hour from recent activity pattern
                const primaryHour = computePersonalizedHour(economy.recentActivityHours ?? []);

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

                    // US-009: 23:00 fallback only if task not done and primary isn't at 23
                    if (economy.lastDailyTaskDate !== today && primaryHour < 23) {
                        const streakDays = economy.streak;
                        const fallbackCopy = streakDays > 0
                            ? { title: `🕚 רצף של ${streakDays} ימים בסכנה`, body: 'שעה אחרונה לשמור עליו, 2 דקות וזהו' }
                            : { title: '🕚 שעה אחרונה ליום', body: 'לא מאוחר מדי להתחיל רצף חדש היום' };
                        await store.scheduleStreakReminderWithCopy(
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

                // Safety net: never leave more than 2 notifications scheduled
                await enforceNotificationCap(2);

            } catch { /* scheduler must never crash the app */ }
        })();
    }, [permissionGranted, preferences, lastScheduledDate, lastFinnCopyTitle]);
}
