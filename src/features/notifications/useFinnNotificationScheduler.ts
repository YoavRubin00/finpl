/**
 * Finn Notification Scheduler — orchestrates context-aware push notifications.
 * Called from useNotificationSetup. Runs once per day on app open.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationStore } from './useNotificationStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { getLevelFromXP } from '../../utils/progression';
import {
    buildStreakContext,
    selectStreakCopyTier,
    getStreakCopy,
    getMorningCopy,
    buildInactivityEscalation,
    pickFinnCopy,
} from './finnNotificationCopy';

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
            const pool = getStreakCopy(tier);
            const copy = pickFinnCopy(pool, lastFinnCopyTitle);
            store.scheduleStreakReminderWithCopy(
                { title: copy.title, body: copy.body, data: { screen: "/(tabs)/learn" } },
                20,
            ).catch(() => {});
            store.setLastFinnCopyTitle(copy.title);
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
