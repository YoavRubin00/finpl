/**
 * Finn Notification Scheduler, orchestrates context-aware push notifications.
 * Called from useNotificationSetup. Runs once per day on app open.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNotificationStore, resolveOneShotFireDate } from './useNotificationStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
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

/** Whole calendar days from IL-ISO `fromISO` to `toISO` (negative if earlier). */
function daysBetweenISO(fromISO: string, toISO: string): number {
    const a = Date.parse(`${fromISO}T12:00:00Z`);
    const b = Date.parse(`${toISO}T12:00:00Z`);
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.round((b - a) / 86400000);
}

/** ≥3h away from `anchorHour`, inside the 8–22 send window. */
function spacedFromAnchor(anchorHour: number): number {
    return anchorHour - 3 >= 8 ? anchorHour - 3 : Math.min(22, anchorHour + 3);
}

/** Deep link for the days 1–3 market-unlock hook. Once the invest fast-track
 *  flag is set (MarketUnlockGate flips it for every eligible learn-tab
 *  visitor) the lesson itself is accessible → land straight in mod-4-19
 *  ("שוק ההון", chapter-4) — same route shape as nextLessonTarget /
 *  register-returnTo. Before that, the learn tab: LessonFlowScreen would
 *  otherwise show the "not unlocked yet" gate, while the learn tab plays the
 *  unlock moment and unlocks the chapter on arrival. */
const MARKET_UNLOCK_LESSON_ROUTE = '/lesson/mod-4-19?chapterId=chapter-4&startPhase=intro&returnTo=topic-tree';
const MARKET_UNLOCK_MAP_ROUTE = '/(tabs)/learn';

/** The channels THIS daily scheduler owns and may cancel/re-arm, in CAP
 *  PRIORITY order (enforceNotificationCap drops from the END). Anything
 *  outside this set — the day-2 appointment push scheduled at permission
 *  grant, tomorrow-chest reminders, fantasy weekly, breaking news — was
 *  scheduled by another owner and MUST survive the daily re-arm. The old
 *  cancelAllScheduledNotificationsAsync() wiped those silently (ChatGPT P0
 *  audit, Yoav 11.7): a user who granted permission on day 0 and reopened
 *  the app later the same day lost their day-2 appointment push.
 *  2026-08-18: + marketHook (days 1–3 market-unlock learning hook) and
 *  dailyChallenge (days 2–7 dilemma) — the "slot 2" new-user rungs. Both are
 *  one-shots re-decided here daily and counted against the SAME 2/day cap. */
const DAILY_CHANNELS = ['inactivity', 'streak', 'streakFallback', 'morning', 'marketHook', 'dailyChallenge'];

/** Hard cap — scoped to the scheduler-owned daily channels only. Counting
 *  ALL scheduled notifications made the cap cancel other owners' pushes
 *  (day-2 appointment / fantasy / tomorrow-chest) whenever the total went
 *  over 2 — same bug class as the cancelAll above. Deterministic: the
 *  lowest-priority channels (end of DAILY_CHANNELS) are dropped first, so a
 *  race with the permission-grant flow can never cost the streak/inactivity
 *  rung its slot. */
async function enforceNotificationCap(maxAllowed: number): Promise<void> {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const daily = all
        .map((n) => {
            const channel = (n.content?.data as Record<string, unknown> | undefined)?.channel;
            const priority = typeof channel === 'string' ? DAILY_CHANNELS.indexOf(channel) : -1;
            return { n, priority };
        })
        .filter((x) => x.priority >= 0)
        .sort((a, b) => a.priority - b.priority);
    if (daily.length <= maxAllowed) return;
    const excess = daily.slice(maxAllowed);
    await Promise.all(excess.map((x) => Notifications.cancelScheduledNotificationAsync(x.n.identifier)));
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
        const today = getIsraelDateISO();
        if (lastDailyTaskDate !== today) return;
        const store = useNotificationStore.getState();
        store.cancelChannel('streakFallback').catch(() => { /* non-fatal */ });
        // 2026-08-18: same rule for the slot-2 one-shots — a user who learned
        // today doesn't need today's market hook / dilemma nudge. Only a
        // still-pending push that lands TODAY is cancelled; one armed for
        // tomorrow (or already delivered) is left alone.
        const now = Date.now();
        const pendingToday = (fireAt: number | null): boolean =>
            fireAt !== null && fireAt > now && getIsraelDateISO(new Date(fireAt)) === today;
        if (pendingToday(store.marketHookFireAt)) {
            store.cancelChannel('marketHook').catch(() => { /* non-fatal */ });
            store.setMarketHookFireAt(null);
        }
        if (pendingToday(store.dailyChallengeFireAt)) {
            store.cancelChannel('dailyChallenge').catch(() => { /* non-fatal */ });
            store.setDailyChallengeFireAt(null);
        }
    }, [permissionGranted, lastDailyTaskDate]);

    useEffect(() => {
        if (!permissionGranted) return;

        const today = getIsraelDateISO();
        if (lastScheduledDate === today) return; // already scheduled today
        const prevScheduledDate = lastScheduledDate;

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

                // ── Channel-owned cancel (Yoav 11.7, replaces cancelAll) ──
                // Clear ONLY the daily channels this scheduler owns, so
                // yesterday's un-fired daily pushes never stack — while the
                // day-2 appointment push, tomorrow-chest reminder, fantasy
                // weekly and breaking-news pushes (other owners) survive.
                // Each schedule* below also self-cancels its channel, so this
                // covers the branch-switch case (e.g. yesterday scheduled
                // streak, today the inactivity branch runs instead).
                await Promise.all(
                    DAILY_CHANNELS.map((c) => store.cancelChannel(c).catch(() => { /* non-fatal */ })),
                );
                // The cancel above also dropped any still-PENDING slot-2 one-shot;
                // forget its fire time so it isn't mistaken for "delivered".
                // A fire time already in the past stays — that's the "market
                // hook fired once, never again" memory.
                const nowMs = Date.now();
                if (store.marketHookFireAt !== null && store.marketHookFireAt > nowMs) store.setMarketHookFireAt(null);
                if (store.dailyChallengeFireAt !== null && store.dailyChallengeFireAt > nowMs) store.setDailyChallengeFireAt(null);

                // New-user day index (day 0 = install). No install date exists
                // anywhere in the app, so anchor on the earliest evidence we have
                // — first active date / earlier scheduler run — and persist it.
                const sortedActive = [...(uiState.activeDates ?? [])].sort();
                const firstSeenDate = store.firstSeenDate
                    ?? [today, prevScheduledDate, sortedActive[0]]
                        .filter((d): d is string => typeof d === 'string' && d.length === 10)
                        .sort()[0];
                if (!store.firstSeenDate) store.setFirstSeenDate(firstSeenDate);
                const userDay = Math.max(0, daysBetweenISO(firstSeenDate, today));

                // Slot accounting for the 2/day cap: what the branch below arms
                // (`budgetUsed`) + the hour the streak/morning reminder fires
                // (`anchorHour`, for ≥3h spacing of the slot-2 push).
                let budgetUsed = 0;
                let anchorHour: number | null = null;

                // ── At most 2 notifications per day, scheduled sequentially ──
                // Priority: inactivity (urgent) > streak at-risk > morning motivation
                if (preferences.inactivity && ctx.daysSinceActive >= 1) {
                    const escalation = buildInactivityEscalation(lastFinnCopyTitle).slice(0, 1);
                    await store.scheduleInactivityEscalation(escalation);
                    store.setLastFinnCopyTitle(escalation[0]?.content.title ?? null);
                    budgetUsed += 1;

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
                    budgetUsed += 1;
                    anchorHour = primaryHour;

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
                        budgetUsed += 1;
                    }

                } else if (preferences.morning) {
                    const copy = pickFinnCopy(getMorningCopy(), lastFinnCopyTitle);
                    await store.scheduleMorningMotivation(
                        { title: copy.title, body: copy.body, data: { screen: '/(tabs)/learn' } },
                    );
                    store.setLastFinnCopyTitle(copy.title);
                    budgetUsed += 1;
                    anchorHour = 9;
                }

                // ── Slot 2 — new-user learning rungs (2026-08-18, D1 = 4.9%) ──
                // Retention-only pushes for the first week, one per day at most,
                // and ONLY when the branch above left room under the 2/day cap:
                //  (a) marketHook   — days 1–3, user has NOT learned that day:
                //      "שוק ההון נפתח לכם", once ever, at the personalised hour
                //      (≥3h from the streak/morning reminder, else the day after).
                //  (b) dailyChallenge — days 2–7, onboarding done: the 12:00
                //      dilemma (spaced from the reminder hour the same way).
                // Learned today already? → the one-shot targets tomorrow (the
                // activity watcher above would cancel a same-day one anyway).
                // Both are cancelled+re-decided on every daily run and by the
                // activity watcher, so a user who shows up never gets nagged.
                if (budgetUsed < 2) {
                    const now = new Date();
                    const activeToday = economyCompat.lastDailyTaskDate === today;
                    const baseOffset = activeToday ? 1 : 0;
                    let slot2Armed = false;

                    // Re-read: `store` is a snapshot from before the setMarketHookFireAt(null) above.
                    const marketHookDelivered = useNotificationStore.getState().marketHookFireAt !== null; // pending ones were cleared above
                    // Only once chapter 4 is ACTUALLY open for this user (the
                    // MarketUnlockGate flips this after their first module
                    // completion since 18.8) — the push promises "נפתח לכם", so
                    // it must land on an open chapter, never a locked map.
                    const marketOpen = useTutorialStore.getState().investChapterJumpUnlocked;
                    if (preferences.marketHook && !marketHookDelivered && marketOpen) {
                        const hookHour = anchorHour === null ? primaryHour : spacedFromAnchor(anchorHour);
                        let offset = baseOffset;
                        let slot = resolveOneShotFireDate(hookHour, offset, now);
                        let fireDay = userDay + daysBetweenISO(today, slot.dateISO);
                        if (fireDay < 1) { // install day itself → the day after
                            offset += 1;
                            slot = resolveOneShotFireDate(hookHour, offset, now);
                            fireDay = userDay + daysBetweenISO(today, slot.dateISO);
                        }
                        if (fireDay >= 1 && fireDay <= 3) {
                            const unlocked = useTutorialStore.getState().investChapterJumpUnlocked;
                            await store.scheduleMarketHook(
                                {
                                    title: 'שוק ההון נפתח לכם',
                                    body: 'המגרש של הגדולים פתוח: מניות, אג"ח ואיך הכסף עובד בשבילכם. 3 דקות.',
                                    data: { screen: unlocked ? MARKET_UNLOCK_LESSON_ROUTE : MARKET_UNLOCK_MAP_ROUTE, user_day: fireDay },
                                },
                                hookHour,
                                offset,
                            );
                            slot2Armed = true;
                            budgetUsed += 1;
                        }
                    }

                    if (!slot2Armed && preferences.dailyChallenge && useAuthStore.getState().hasCompletedOnboarding) {
                        const challengeHour = anchorHour === null || Math.abs(12 - anchorHour) >= 3
                            ? 12
                            : spacedFromAnchor(anchorHour);
                        const slot = resolveOneShotFireDate(challengeHour, baseOffset, now);
                        const fireDay = userDay + daysBetweenISO(today, slot.dateISO);
                        if (fireDay >= 2 && fireDay <= 7) {
                            await store.scheduleDailyChallenge(challengeHour, baseOffset);
                            slot2Armed = true;
                            budgetUsed += 1;
                        }
                    }
                }

                // Tool-of-the-day is now an IN-APP top banner (ToolsDiscoveryBanner
                // on the home screen), not an OS push (Yoav 18/06: keep it in-app).

                // Guest register nudge (Yoav 11.7): one push per day whose whole
                // job is registration — an unregistered user's progress is one
                // lost phone away from gone, and the guest is the majority of
                // organic traffic with zero other touchpoints. Own channel
                // ('registerNudge' data-key, Android channel upgradeNudge which
                // already exists) — NOT in DAILY_CHANNELS, so the cap below
                // never cuts it; cancelled+re-armed here daily, and dropped
                // entirely once the user registers.
                try {
                  const all = await Notifications.getAllScheduledNotificationsAsync();
                  await Promise.all(
                    all
                      .filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.channel === 'registerNudge')
                      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
                  );
                  const { useAuthStore: authStore } = require('../auth/useAuthStore') as typeof import('../auth/useAuthStore');
                  if (authStore.getState().isGuest) {
                    const now = new Date();
                    const fireAt = new Date(now);
                    fireAt.setHours(19, 30, 0, 0);
                    if (fireAt.getTime() <= now.getTime()) fireAt.setDate(fireAt.getDate() + 1);
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: 'ההתקדמות שלכם עדיין לא שמורה',
                        body: 'המטבעות, הרצף והרמות — הכל על המכשיר הזה בלבד. 30 שניות להרשמה וזה שלכם לתמיד.',
                        data: { channel: 'registerNudge', screen: '/(auth)/register' },
                        ...(Platform.OS === 'android' ? { channelId: 'upgradeNudge' } : {}),
                      },
                      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
                    });
                  }
                } catch { /* non-fatal */ }

                // Safety net: never leave more than 2 notifications scheduled
                await enforceNotificationCap(2);

            } catch { /* scheduler must never crash the app */ }
        })();
    }, [permissionGranted, preferences, lastScheduledDate, lastFinnCopyTitle]);
}
