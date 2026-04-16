/**
 * Finn Notification Scheduler — orchestrates context-aware push notifications.
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
    getStreakCopy,
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
    // Schedule 2h before the habit window — clamp to a sane evening range (8-22)
    const target = Math.round(avg) - 2;
    return Math.max(8, Math.min(22, target));
}

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

export function useFinnNotificationScheduler() {
    const permissionGranted = useNotificationStore((s) => s.permissionGranted);
    const preferences = useNotificationStore((s) => s.preferences);
    const lastScheduledDate = useNotificationStore((s) => s.lastScheduledDate);
    const lastFinnCopyTitle = useNotificationStore((s) => s.lastFinnCopyTitle);

    useEffect(() => {
        if (!permissionGranted) return;
        try {

        const today = todayISO();
        if (lastScheduledDate === today) return; // already scheduled today

        const economy = useEconomyStore.getState();
        const level = getLevelFromXP(economy.xp);
        const ctx = buildStreakContext(economy, level);

        const store = useNotificationStore.getState();

        // US-007: personalized send hour from recent activity pattern
        const primaryHour = computePersonalizedHour(economy.recentActivityHours ?? []);

        // US-008: tone adapted to user's onboarding daily-goal answer
        const goalMinutes = useAuthStore.getState().profile?.dailyGoalMinutes;
        const tone = getToneFromGoal(typeof goalMinutes === 'number' ? goalMinutes : null);

        // ── Cancel ALL previously scheduled notifications to enforce 1/day cap ──
        // This prevents stacking from legacy repeating schedules, chest timers, etc.
        Notifications.cancelAllScheduledNotificationsAsync().catch(() => { /* fire-and-forget */ });

        // ── Max 1 notification per day. Pick the most relevant one by priority. ──
        // Priority: inactivity (urgent) > streak at-risk > morning motivation
        if (preferences.inactivity && ctx.daysSinceActive >= 1) {
            // User missed at least a day → urgent re-engagement (single fire only — 1/day cap)
            const escalation = buildInactivityEscalation(lastFinnCopyTitle).slice(0, 1);
            store.scheduleInactivityEscalation(escalation).catch(() => {});
            store.setLastFinnCopyTitle(escalation[0]?.content.title ?? null);
        } else if (preferences.streak) {
            // Default: evening streak reminder (the most useful daily nudge)
            const tier = selectStreakCopyTier(ctx);
            // US-008: pick tone-adjusted pool for 'safe' tier; urgent tiers keep default urgency
            const pool = getStreakCopyForGoal(tier, tone);
            const copy = pickFinnCopy(pool, lastFinnCopyTitle);
            store.scheduleStreakReminderWithCopy(
                { title: copy.title, body: copy.body, data: { screen: "/(tabs)/learn" } },
                primaryHour,
            ).catch(() => {});
            store.setLastFinnCopyTitle(copy.title);

            // US-009: schedule a 23:00 fallback save-your-streak notification if user hasn't completed today.
            // Will get cancelled automatically when user completes daily task (see useEconomyStore.completeDailyTask).
            if (economy.lastDailyTaskDate !== today && primaryHour < 23) {
                const streakDays = economy.streak;
                const fallbackCopy = streakDays > 0
                    ? { title: `🕚 רצף של ${streakDays} ימים בסכנה`, body: 'שעה אחרונה לשמור עליו — 2 דקות וזהו' }
                    : { title: '🕚 שעה אחרונה ליום', body: 'לא מאוחר מדי להתחיל רצף חדש היום' };
                store.scheduleStreakReminderWithCopy(
                    { title: fallbackCopy.title, body: fallbackCopy.body, data: { screen: '/(tabs)/learn' } },
                    23,
                ).catch(() => {});
            }
        } else if (preferences.morning) {
            // Fallback: morning motivation if streak reminders are off
            const copy = pickFinnCopy(getMorningCopy(), lastFinnCopyTitle);
            store.scheduleMorningMotivation(
                { title: copy.title, body: copy.body, data: { screen: "/(tabs)/learn" } },
            ).catch(() => {});
            store.setLastFinnCopyTitle(copy.title);
        }

        // Mark as scheduled for today
        store.setLastScheduledDate(today);
        } catch { /* safe — scheduler must never crash the app */ }
    }, [permissionGranted, preferences, lastScheduledDate, lastFinnCopyTitle]);
}
