import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { XPSource } from "../../types/economy";
import {
  DAILY_TASK_XP,
  DAILY_TASK_COINS,
  STREAK_BONUS_BASE_XP,
  LOGIN_BONUS_XP,
  STREAK_7_BONUS_XP,
  STREAK_30_BONUS_XP,
} from "../../constants/economy";
import { getLevelFromXP, getPyramidLayer } from "../../utils/progression";
import { upsertInventory } from "../../db/sync/syncInventory";
import { useAuthStore } from "../auth/useAuthStore";
import * as Notifications from "expo-notifications";
import { applyEconomyDelta } from "../../lib/api/economy";
import { queryClient } from "../../lib/queryClient";
import { economyQueryKey } from "./useEconomy";
import { registerLocalStore } from "../../lib/stores/registry";
import type { Economy } from "../../lib/api/economy";
import type { StreakState } from "../../lib/api/streak";

// Streak query key — duplicated as a literal here (instead of importing from
// ./useStreak) to avoid a circular module load (useStreak already imports
// THIS file). Must stay in sync with streakQueryKey in ./useStreak.ts.
const STREAK_QUERY_KEY = ['streak'] as const;
import { logLevelUp, logStreakMilestone } from "../../utils/fbEvents";

const STREAK_MILESTONE_DAYS: ReadonlySet<number> = new Set([3, 7, 14, 30, 60, 90]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// All streak math runs in Israel-local time, matching the server-side
// `todayIsraelDate()` in ./useStreak.ts. Without this, a user outside
// UTC+2/+3 (e.g. an Israeli expat in NY at 11pm) sees "today" flip a day
// before their wall clock — local `activeDates` records UTC's tomorrow
// while server records IL's today, and the streak silently skips a day.
// The formatter is reused (intentionally module-scoped) since Intl is
// the heavy bit; the impl is duplicated rather than imported from
// useStreak to keep this file free of circular imports (useStreak
// already imports useEconomyUIStore).
const IL_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayISO(): string {
  return IL_DATE_FMT.format(new Date());
}

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return IL_DATE_FMT.format(d);
}

function ninetyDaysAgoISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return IL_DATE_FMT.format(d);
}

function daysBetween(dateA: string, dateB: string): number {
  return Math.floor(
    (new Date(dateB + "T00:00:00").getTime() - new Date(dateA + "T00:00:00").getTime()) / 86400000
  );
}

/**
 * Walks back day-by-day from today (or yesterday, if today isn't yet marked)
 * over the union of activeDates + frozenDates, counting consecutive days. This
 * is the local "source of truth" for current streak — used by completeDailyTask
 * and mirrored into the React Query cache on hydration so the header shows the
 * correct streak even for guests who can't read the server-side counter.
 */
/** IL day-of-week for a "YYYY-MM-DD" string: 0=Sunday … 5=Friday, 6=Saturday.
 *  Anchored at noon-UTC so no timezone offset can nudge it across a boundary. */
function isoDayOfWeek(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

/** The calendar day before an IL "YYYY-MM-DD" string. */
function isoPrevDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Shabbat bridge (Yoav 2026-07-04): Saturday is auto-credited to the streak, so
 * Shabbat-observant users don't lose their run for not opening the app on שבת.
 * True when the last active day was a FRIDAY and `today` is the SUNDAY two days
 * later — i.e. the ONLY skipped day is Saturday. Friday → (Sat auto) → Sunday
 * keeps AND grows the streak, no freeze consumed.
 */
export function isShabbatBridge(lastActiveISO: string | null | undefined, today: string): boolean {
  if (!lastActiveISO) return false;
  return daysBetween(lastActiveISO, today) === 2 && isoDayOfWeek(lastActiveISO) === 5;
}

export function deriveStreakFromDates(activeDates: string[], frozenDates: string[]): number {
  const dateSet = new Set([...activeDates, ...frozenDates]);
  // Shabbat bridge: a Saturday counts as active when the preceding Friday is —
  // so the backward walk never breaks over שבת even though it's unmarked.
  const isActive = (iso: string): boolean =>
    dateSet.has(iso) || (isoDayOfWeek(iso) === 6 && dateSet.has(isoPrevDay(iso)));
  const today2 = todayISO();
  const yest2 = yesterdayISO();
  let cursor: Date | null = isActive(today2)
    ? new Date()
    : isActive(yest2)
      ? (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return d; })()
      : null;
  let count = 0;
  while (cursor) {
    // Format in Israel time so the cursor's ISO matches the strings stored
    // in activeDates / frozenDates (which are all IL-zoned per todayISO).
    // Walking with UTC was a silent bug for users not in UTC+2/+3 — the
    // initial today/yesterday check passed but the loop's first IL→UTC
    // mismatch broke the chain at count=0.
    const iso = IL_DATE_FMT.format(cursor);
    if (!isActive(iso)) break;
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (count > 365) break;
  }
  return count;
}

function trimDates(dates: string[]): string[] {
  const cutoff = ninetyDaysAgoISO();
  return dates.filter((d) => d >= cutoff);
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface EconomyUIState {
  // ── Streak calendar ──────────────────────────────────────────────────────
  lastDailyTaskDate: string | null;
  lastLoginBonusDate: string | null;
  starterCapitalGranted: boolean;
  activeDates: string[];     // ISO dates when user completed a task (bounded to 90 days)
  frozenDates: string[];     // ISO dates when a streak freeze was auto-consumed
  // Learning coins earned per IL-day (lesson/quiz/daily-quest only), pruned to
  // the last 3 days. Feeds the tomorrow-chest 50% overnight match
  // (מוני 8.7, approved: "הכסף שלך עובד בלילה").
  coinsEarnedByDay: Record<string, number>;
  streakFreezes: number;     // owned freeze items count
  // Board 2026-06-18: 2 free freezes granted ONCE at onboarding (see grantOnboardingFreezes).
  // This flag makes that grant idempotent across re-runs / re-installs.
  onboardingFreezesGranted: boolean;
  // Board 2026-06-18: day-2 / day-3 are the habit-forming days. We give a small
  // one-per-day coin reward there; this records the last streak-day we paid out
  // so the reward can't double-fire if the celebration re-mounts the same day.
  lastStreakDayRewardDate: string | null;
  pendingFreezeSaveAck: boolean; // true when freeze was consumed, cleared on modal dismiss
  // Streak Repair (US-004), offered ONCE per break if prev streak >= 3
  pendingRepairOffer: boolean;
  previousStreakBeforeBreak: number; // snapshot of streak immediately before it reset to 1
  lastRepairOfferedAt: string | null;
  // US-007: track last 14 days' hour-of-day of activity (for personalized notification time)
  recentActivityHours: number[];
  // Session stacking bonus (Playtika/Slotomania pattern)
  lastSessionAt: number | null;
  pendingSessionBonus: { coins: number; hoursAway: number } | null;
  // Hearts-full XP boost
  lessonXPMultiplier: number;
  // Active temporary boosts purchased from the shop
  activeBoosts: import('../shop/types').ActiveBoost[];
  // Streak Insurance
  weeklyShieldUntil: number | null;
  monthlyShieldUntil: number | null;
  /** Number of one-shot Elite revivals owned */
  eliteRevivalCount: number;

  // ── Transient banners (session-only) ─────────────────────────────────────
  pendingLevelUp: number | null;

  // ── Methods ──────────────────────────────────────────────────────────────
  addXP: (amount: number, source: XPSource) => void;
  addCoins: (amount: number, source?: import('../social/referralConstants').CoinEventSource) => void;
  addGems: (amount: number) => void;
  completeDailyTask: () => void;
  awardLoginBonus: () => void;
  awardSessionStackingBonus: () => number;
  dismissSessionBonus: () => void;
  setLessonXPMultiplier: (value: number) => void;
  activateBoost: (
    id: string,
    durationMs: number,
    multipliers: { xpMultiplier?: number; coinMultiplier?: number; questRewardMultiplier?: number },
  ) => void;
  getActiveBoostMultipliers: () => { xp: number; coins: number; questReward: number };
  activateStreakShield: (kind: 'week' | 'month') => void;
  grantEliteRevival: () => void;
  useEliteRevival: () => boolean;
  grantStarterCapital: () => boolean;
  dismissLevelUp: () => void;
  addStreakFreezes: (count: number) => void;
  /** Board 2026-06-18: grant the 2 onboarding free freezes, exactly once ever. Returns true if granted. */
  grantOnboardingFreezes: () => boolean;
  /** Board 2026-06-18: small day-2 / day-3 habit reward (coins), idempotent per day. Returns coins granted (0 if none). */
  awardStreakDayReward: (streak: number) => number;
  dismissFreezeSaveAck: () => void;
  repairStreak: (source: "gems" | "ad") => boolean;
  dismissRepairOffer: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state values (used also in reset())
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  lastDailyTaskDate: null as string | null,
  lastLoginBonusDate: null as string | null,
  starterCapitalGranted: false,
  pendingLevelUp: null as number | null,
  activeDates: [] as string[],
  frozenDates: [] as string[],
  coinsEarnedByDay: {} as Record<string, number>,
  streakFreezes: 0,
  onboardingFreezesGranted: false,
  lastStreakDayRewardDate: null as string | null,
  pendingFreezeSaveAck: false,
  pendingRepairOffer: false,
  previousStreakBeforeBreak: 0,
  lastRepairOfferedAt: null as string | null,
  recentActivityHours: [] as number[],
  lastSessionAt: null as number | null,
  pendingSessionBonus: null as { coins: number; hoursAway: number } | null,
  lessonXPMultiplier: 1.0,
  activeBoosts: [] as import('../shop/types').ActiveBoost[],
  weeklyShieldUntil: null as number | null,
  monthlyShieldUntil: null as number | null,
  eliteRevivalCount: 0,
};

// ---------------------------------------------------------------------------
// Fire-and-forget economy delta (for non-hook action contexts)
// ---------------------------------------------------------------------------

/**
 * Canonical "fire and forget economy delta" for non-hook call sites (Zustand
 * actions, callbacks, async event handlers). Does three things:
 *   1. Optimistic cache write — useEconomy() consumers (wealth header, etc.)
 *      reflect the change immediately.
 *   2. POST /api/sync/economy.
 *   3. On success, writes the server's authoritative Economy row straight
 *      into the cache (NO invalidate — saves a redundant GET round-trip after
 *      every XP/coin/gem mutation across the app).
 *
 * Exported so trading-hub, real-assets, bridge, hearts, and LessonFlow can
 * stop duplicating the `applyEconomyDelta(...).then(() => invalidate)`
 * boilerplate at 11 call sites and get optimistic UX for free.
 */
export function fireEconomyDelta(delta: {
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
  virtualBalanceSet?: number;
}) {
  // Optimistic cache update so useEconomy() consumers (the wealth header, etc.)
  // reflect the delta immediately. Without this the UI waits for the server
  // roundtrip + invalidate — which silently never resolves when /api/sync/economy
  // isn't deployed (DEV without server, missing route). XP earned in modules
  // was effectively invisible until next cold start.
  queryClient.setQueryData<Economy | null>(economyQueryKey, (old) => {
    if (!old) {
      return {
        xp: delta.xpDelta ?? 0,
        coins: delta.coinsDelta ?? 0,
        gems: delta.gemsDelta ?? 0,
        level: null,
        virtualBalance: typeof delta.virtualBalanceSet === 'number'
          ? delta.virtualBalanceSet.toString()
          : '0',
      };
    }
    return {
      ...old,
      xp: (old.xp ?? 0) + (delta.xpDelta ?? 0),
      coins: (old.coins ?? 0) + (delta.coinsDelta ?? 0),
      gems: (old.gems ?? 0) + (delta.gemsDelta ?? 0),
      virtualBalance: typeof delta.virtualBalanceSet === 'number'
        ? delta.virtualBalanceSet.toString()
        : old.virtualBalance,
    };
  });
  applyEconomyDelta(delta)
    // Server response IS the authoritative economy — write it straight to the
    // cache instead of invalidating (which would trigger a second GET round-trip
    // for data we already have in hand).
    .then((res) => {
      queryClient.setQueryData<Economy | null>(economyQueryKey, res.economy);
      // Mirror the server-authoritative economy to the profile row (keyed by
      // email via /api/sync/profile). CRITICAL: we mirror the SERVER's values
      // from `res.economy`, never the optimistic React Query cache. The old
      // per-action upsertInventory calls read the cache — which on a cold-start
      // race is still empty (coins/gems = 0) before the economy GET resolves —
      // and wrote 0/0 absolute, wiping the real balance. Active users lost all
      // coins+gems this way (QA 2026-06-16). Sourcing from res.economy makes the
      // mirror impossible to clobber.
      const eco = res.economy;
      const authId = useAuthStore.getState().email;
      if (eco && authId) {
        upsertInventory(authId, {
          xp: eco.xp ?? 0,
          coins: eco.coins ?? 0,
          gems: eco.gems ?? 0,
        }).catch(() => { /* non-fatal mirror */ });
      }
    })
    .catch(() => { /* swallow — optimistic state stays until server is reachable */ });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEconomyUIStore = create<EconomyUIState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addXP: (amount: number, _source: XPSource) => {
        if (amount <= 0) return;
        const mult = get().lessonXPMultiplier;
        const isLessonSource = _source === 'lesson_complete' || _source === 'quiz_correct';
        let finalAmount = amount;
        if (mult > 1.0 && isLessonSource) {
          finalAmount = Math.round(amount * mult);
          set({ lessonXPMultiplier: 1.0 });
        }
        if (isLessonSource) {
          const boostXp = get().getActiveBoostMultipliers().xp;
          if (boostXp > 1.0) finalAmount = Math.round(finalAmount * boostXp);
        }
        // Read current xp from server-backed query cache for level-up detection
        const cached = queryClient.getQueryData<Economy | null>(economyQueryKey);
        const prevXP = cached?.xp ?? 0;
        const prevLevel = getLevelFromXP(prevXP);
        const prevLayer = getPyramidLayer(prevXP);
        const newXP = prevXP + finalAmount;
        const newLevel = getLevelFromXP(newXP);
        const newLayer = getPyramidLayer(newXP);
        if (newLevel > prevLevel) {
          set({ pendingLevelUp: newLevel });
          logLevelUp(newLevel);
        }
        // Notify when investments unlock (layer 2)
        if (prevLayer < 2 && newLayer >= 2) {
          const notifStore = require("../notifications/useNotificationStore").useNotificationStore;
          if (notifStore.getState().permissionGranted) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "📈 מרכז ההשקעות נפתח!",
                body: "הגעתם לשלב 2, בואו נגלה מה מחכה לכם בעולם ההשקעות!",
                data: { screen: "/(tabs)/investments" },
              },
              trigger: null,
            }).catch(() => {});
          }
        }
        // Server-backed: fire delta. The /api/sync/profile mirror is handled
        // centrally in fireEconomyDelta using the server's authoritative values
        // (see note there) — never from the optimistic cache, which used to
        // clobber coins/gems to 0 on cold-start races.
        fireEconomyDelta({ xpDelta: finalAmount });
      },

      dismissLevelUp: () => set({ pendingLevelUp: null }),

      addCoins: (amount: number, source) => {
        if (amount <= 0) return;
        let finalAmount = amount;
        if (source === 'lesson' || source === 'quiz' || source === 'daily-quest') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getActiveRewardMultiplier } = require('../seasonal-events/seasonalEvents') as typeof import('../seasonal-events/seasonalEvents');
          const seasonalMult = getActiveRewardMultiplier();
          if (seasonalMult > 1.0) finalAmount = Math.round(finalAmount * seasonalMult);
          const boostCoins = get().getActiveBoostMultipliers().coins;
          if (boostCoins > 1.0) finalAmount = Math.round(finalAmount * boostCoins);
          // Per-day learning-earn ledger for the tomorrow-chest 50% overnight
          // match (מוני 8.7). Pruned to 3 days so the persisted map stays tiny.
          const dayKey = todayISO();
          const ledger = { ...get().coinsEarnedByDay };
          ledger[dayKey] = (ledger[dayKey] ?? 0) + finalAmount;
          const keys = Object.keys(ledger).sort();
          while (keys.length > 3) { delete ledger[keys.shift() as string]; }
          set({ coinsEarnedByDay: ledger });
        }
        fireEconomyDelta({ coinsDelta: finalAmount });
        // The profile-row mirror is centralized in fireEconomyDelta (server
        // truth). Here we only append the referral-dividend telemetry event.
        const authId = useAuthStore.getState().email;
        if (authId && source) {
          import('../../db/sync/syncCoinEvents')
            .then((m) => m.logCoinGrant(authId, finalAmount, source))
            .catch(() => { /* non-fatal */ });
        }
      },

      addGems: (amount: number) => {
        if (amount <= 0) return;
        // Profile-row mirror handled centrally in fireEconomyDelta (server truth).
        fireEconomyDelta({ gemsDelta: amount });
      },

      completeDailyTask: () => {
        const { lastDailyTaskDate, streakFreezes, activeDates, frozenDates, weeklyShieldUntil, monthlyShieldUntil } = get();
        // Local activeDates is the source of truth for the UI streak.
        const derivedStreak = deriveStreakFromDates(activeDates, frozenDates);

        const today = todayISO();
        if (lastDailyTaskDate === today) return;

        const isConsecutiveDay = lastDailyTaskDate === yesterdayISO();
        const gap = lastDailyTaskDate ? daysBetween(lastDailyTaskDate, today) : 999;
        const bridge = isShabbatBridge(lastDailyTaskDate, today); // Shabbat auto-counts
        const canFreeze = !bridge && gap === 2 && streakFreezes > 0;
        const now = Date.now();
        const weeklyShieldActive = weeklyShieldUntil != null && weeklyShieldUntil > now;
        const monthlyShieldActive = monthlyShieldUntil != null && monthlyShieldUntil > now;
        const canWeeklyShield = weeklyShieldActive && gap >= 2 && gap <= 4;
        const canMonthlyShield = monthlyShieldActive && gap >= 2 && gap <= 8;
        const canShield = !canFreeze && (canWeeklyShield || canMonthlyShield);

        let newStreak: number;
        let freezeConsumed = false;
        let streakBroke = false;
        if (isConsecutiveDay || bridge) {
          newStreak = derivedStreak + 1;
        } else if (canFreeze) {
          newStreak = derivedStreak + 1;
          freezeConsumed = true;
        } else if (canShield) {
          newStreak = derivedStreak + 1;
        } else {
          newStreak = 1;
          streakBroke = derivedStreak >= 3;
        }

        const streakBonus = (isConsecutiveDay || bridge || freezeConsumed) ? STREAK_BONUS_BASE_XP * newStreak : 0;
        let milestoneBonus = 0;
        if (newStreak === 7) milestoneBonus = STREAK_7_BONUS_XP;
        if (newStreak > 0 && newStreak % 30 === 0) milestoneBonus = STREAK_30_BONUS_XP;
        const grantFreeze = newStreak === 7;

        const updatedActiveDates = trimDates([...activeDates, today]);
        const updatedFrozenDates = freezeConsumed
          ? trimDates([...frozenDates, yesterdayISO()])
          : trimDates(frozenDates);

        const netFreezeDelta = (grantFreeze ? 1 : 0) - (freezeConsumed ? 1 : 0);

        set((state) => ({
          lastDailyTaskDate: today,
          activeDates: updatedActiveDates,
          frozenDates: updatedFrozenDates,
          streakFreezes: state.streakFreezes + netFreezeDelta,
          ...(freezeConsumed ? { pendingFreezeSaveAck: true } : {}),
          ...(streakBroke && state.lastRepairOfferedAt !== today
            ? { pendingRepairOffer: true, previousStreakBeforeBreak: derivedStreak }
            : {}),
          recentActivityHours: [...state.recentActivityHours.slice(-13), new Date().getHours()],
        }));

        // Mirror the new streak into the React Query cache so GlobalWealthHeader
        // (which reads via useStreak()) reflects the bump immediately, even when
        // the server-side recordDailyActivity hasn't returned yet — or fails
        // entirely (offline, or unauthenticated user at end of onboarding before
        // enterGuestMode runs). The async server response, when it arrives,
        // overwrites this with the authoritative value via markDailyActivityCompleted's
        // .then(setQueryData) chain in useStreak.ts.
        try {
          const existing = queryClient.getQueryData<StreakState | null>(STREAK_QUERY_KEY);
          queryClient.setQueryData<StreakState | null>(STREAK_QUERY_KEY, {
            currentStreak: newStreak,
            longestStreak: Math.max(existing?.longestStreak ?? 0, newStreak),
            lastActiveDate: today,
          });
        } catch { /* non-fatal */ }

        // Fire server-backed XP + coins
        const totalXP = DAILY_TASK_XP + streakBonus + milestoneBonus;
        if (totalXP > 0) fireEconomyDelta({ xpDelta: totalXP });
        fireEconomyDelta({ coinsDelta: DAILY_TASK_COINS });

        // Check level-up
        const cachedEco = queryClient.getQueryData<Economy | null>(economyQueryKey);
        if (cachedEco && totalXP > 0) {
          const prevXP = cachedEco.xp ?? 0;
          const prevLevel = getLevelFromXP(prevXP);
          const newLevel = getLevelFromXP(prevXP + totalXP);
          if (newLevel > prevLevel) set({ pendingLevelUp: newLevel });
        }

        // Log streak milestone analytics — only when the streak actually
        // advanced into a milestone slot (avoids re-firing on idempotent
        // same-day completions).
        if (newStreak > derivedStreak && STREAK_MILESTONE_DAYS.has(newStreak)) {
          logStreakMilestone(newStreak);
        }

        // Cancel today's streak reminder, user already completed the daily task
        try {
          const notifMod = require("../notifications/useNotificationStore");
          const notifStore = notifMod.useNotificationStore.getState();
          if (notifStore.preferences.streak) {
            notifStore.cancelChannel("streak");
          }
        } catch {
          // notification store may not be available
        }
      },

      awardLoginBonus: () => {
        const { lastLoginBonusDate, lastDailyTaskDate, streakFreezes, activeDates, frozenDates, weeklyShieldUntil, monthlyShieldUntil } = get();
        const today = todayISO();
        if (lastLoginBonusDate === today) return;

        // Reuse the shared helper so the date math here can't drift away
        // from completeDailyTask / onRehydrateStorage (the inline copy
        // that used to live here had the same IL-vs-UTC walk bug fixed
        // in deriveStreakFromDates).
        const derivedStreak = deriveStreakFromDates(activeDates, frozenDates);

        const lastActive = lastDailyTaskDate ?? lastLoginBonusDate;
        const isConsecutiveDay = lastActive === yesterdayISO();
        const gap = lastActive ? daysBetween(lastActive, today) : 999;
        const bridge = isShabbatBridge(lastActive, today); // Shabbat auto-counts
        const canFreeze = !bridge && gap === 2 && streakFreezes > 0;
        const now = Date.now();
        const weeklyShieldActive = weeklyShieldUntil != null && weeklyShieldUntil > now;
        const monthlyShieldActive = monthlyShieldUntil != null && monthlyShieldUntil > now;
        const canWeeklyShield = weeklyShieldActive && gap >= 2 && gap <= 4;
        const canMonthlyShield = monthlyShieldActive && gap >= 2 && gap <= 8;
        const canShield = !canFreeze && (canWeeklyShield || canMonthlyShield);

        let newStreak: number;
        let freezeConsumed = false;
        let streakBroke = false;
        if (isConsecutiveDay || bridge) {
          newStreak = derivedStreak + 1;
        } else if (lastActive === today) {
          newStreak = derivedStreak;
        } else if (canFreeze) {
          newStreak = derivedStreak + 1;
          freezeConsumed = true;
        } else if (canShield) {
          newStreak = derivedStreak + 1;
        } else {
          newStreak = 1;
          streakBroke = derivedStreak >= 3;
        }

        const grantFreeze = newStreak === 7 && derivedStreak !== 7;
        const updatedActiveDates = trimDates([...activeDates, today]);
        const updatedFrozenDates = freezeConsumed
          ? trimDates([...frozenDates, yesterdayISO()])
          : trimDates(frozenDates);

        const netFreezeDelta = (grantFreeze ? 1 : 0) - (freezeConsumed ? 1 : 0);

        if (newStreak > derivedStreak && STREAK_MILESTONE_DAYS.has(newStreak)) {
          logStreakMilestone(newStreak);
        }

        set((state) => ({
          lastLoginBonusDate: today,
          activeDates: updatedActiveDates,
          frozenDates: updatedFrozenDates,
          streakFreezes: state.streakFreezes + netFreezeDelta,
          ...(freezeConsumed ? { pendingFreezeSaveAck: true } : {}),
          ...(streakBroke && state.lastRepairOfferedAt !== today
            ? { pendingRepairOffer: true, previousStreakBeforeBreak: derivedStreak }
            : {}),
          recentActivityHours: [...state.recentActivityHours.slice(-13), new Date().getHours()],
        }));

        fireEconomyDelta({ xpDelta: LOGIN_BONUS_XP });

        const cachedEco = queryClient.getQueryData<Economy | null>(economyQueryKey);
        if (cachedEco) {
          const prevXP = cachedEco.xp ?? 0;
          const prevLevel = getLevelFromXP(prevXP);
          const newLevel = getLevelFromXP(prevXP + LOGIN_BONUS_XP);
          if (newLevel > prevLevel) set({ pendingLevelUp: newLevel });
        }
      },

      addStreakFreezes: (count: number) => {
        if (count <= 0) return;
        set((state) => ({ streakFreezes: state.streakFreezes + count }));
      },

      // Board 2026-06-18: have-streak>=2 is only ~5%, so protection arriving at
      // day-7 is too late — almost nobody reaches it. Grant 2 free freezes at
      // onboarding instead, so the user is protected through the first-72h danger
      // zone. Persisted flag → granted exactly once ever (re-running onboarding,
      // re-installs after rehydrate, etc. won't re-grant).
      grantOnboardingFreezes: (): boolean => {
        if (get().onboardingFreezesGranted) return false;
        set((state) => ({
          streakFreezes: state.streakFreezes + 2,
          onboardingFreezesGranted: true,
        }));
        return true;
      },

      // Board 2026-06-18: day-2 and day-3 are the habit-forming days. A small,
      // restrained coin reward (Audrey: not casino) reinforces the loop right
      // where it matters. Idempotent per day via lastStreakDayRewardDate so a
      // celebration re-mount can't double-pay.
      awardStreakDayReward: (streak: number): number => {
        if (streak !== 2 && streak !== 3) return 0;
        const today = todayISO();
        if (get().lastStreakDayRewardDate === today) return 0;
        const coins = streak === 2 ? 20 : 30;
        set({ lastStreakDayRewardDate: today });
        get().addCoins(coins);
        return coins;
      },

      dismissFreezeSaveAck: () => set({ pendingFreezeSaveAck: false }),

      repairStreak: (source: "gems" | "ad") => {
        const { pendingRepairOffer, previousStreakBeforeBreak } = get();
        if (!pendingRepairOffer || previousStreakBeforeBreak < 3) return false;
        if (source === "gems") {
          const REPAIR_COST = 30;
          const cached = queryClient.getQueryData<Economy | null>(economyQueryKey);
          const gems = cached?.gems ?? 0;
          if (gems < REPAIR_COST) return false;
          fireEconomyDelta({ gemsDelta: -REPAIR_COST });
        }
        const today = todayISO();
        set((state) => ({
          lastDailyTaskDate: today,
          activeDates: trimDates([...state.activeDates, today]),
          pendingRepairOffer: false,
          lastRepairOfferedAt: today,
        }));
        return true;
      },

      dismissRepairOffer: () => {
        set({ pendingRepairOffer: false, lastRepairOfferedAt: todayISO() });
      },

      grantStarterCapital: (): boolean => {
        const { starterCapitalGranted } = get();
        if (starterCapitalGranted) return false;
        set({ starterCapitalGranted: true });
        fireEconomyDelta({ coinsDelta: 2500 });
        return true;
      },

      awardSessionStackingBonus: (): number => {
        const now = Date.now();
        const last = get().lastSessionAt;
        if (last == null) {
          set({ lastSessionAt: now });
          return 0;
        }
        const hoursAway = (now - last) / (1000 * 60 * 60);
        let bonus = 0;
        if (hoursAway >= 12) bonus = 2000;
        else if (hoursAway >= 8) bonus = 800;
        else if (hoursAway >= 4) bonus = 300;
        else if (hoursAway >= 2) bonus = 120;
        else if (hoursAway >= 1) bonus = 50;
        else return 0;
        set((state) => ({
          lastSessionAt: now,
          pendingSessionBonus: { coins: bonus, hoursAway: Math.round(hoursAway) },
        }));
        fireEconomyDelta({ coinsDelta: bonus });
        return bonus;
      },

      dismissSessionBonus: () => set({ pendingSessionBonus: null }),

      setLessonXPMultiplier: (value: number) => {
        const safe = value > 1.0 ? Math.min(value, 1.5) : 1.0;
        if (get().lessonXPMultiplier === safe) return;
        set({ lessonXPMultiplier: safe });
      },

      activateBoost: (id, durationMs, multipliers) => {
        const now = Date.now();
        const fresh = get().activeBoosts.filter(
          (b) => b.expiresAt > now && b.id !== id,
        );
        set({
          activeBoosts: [
            ...fresh,
            {
              id,
              expiresAt: now + durationMs,
              xpMultiplier: multipliers.xpMultiplier,
              coinMultiplier: multipliers.coinMultiplier,
              questRewardMultiplier: multipliers.questRewardMultiplier,
            },
          ],
        });
      },

      getActiveBoostMultipliers: () => {
        const now = Date.now();
        const active = get().activeBoosts.filter((b) => b.expiresAt > now);
        if (active.length !== get().activeBoosts.length) {
          set({ activeBoosts: active });
        }
        let xp = 1.0, coins = 1.0, questReward = 1.0;
        for (const b of active) {
          if (b.xpMultiplier && b.xpMultiplier > 1.0) xp *= b.xpMultiplier;
          if (b.coinMultiplier && b.coinMultiplier > 1.0) coins *= b.coinMultiplier;
          if (b.questRewardMultiplier && b.questRewardMultiplier > 1.0) questReward *= b.questRewardMultiplier;
        }
        return { xp, coins, questReward };
      },

      activateStreakShield: (kind) => {
        const now = Date.now();
        const ms = kind === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        if (kind === 'week') {
          const cur = get().weeklyShieldUntil ?? 0;
          set({ weeklyShieldUntil: Math.max(cur, now + ms) });
        } else {
          const cur = get().monthlyShieldUntil ?? 0;
          set({ monthlyShieldUntil: Math.max(cur, now + ms) });
        }
      },

      grantEliteRevival: () => {
        set((state) => ({ eliteRevivalCount: state.eliteRevivalCount + 1 }));
      },

      useEliteRevival: (): boolean => {
        const count = get().eliteRevivalCount;
        if (count <= 0) return false;
        const prevStreak = get().previousStreakBeforeBreak;
        if (prevStreak < 1) return false;
        set({
          eliteRevivalCount: count - 1,
          pendingRepairOffer: false,
          previousStreakBeforeBreak: 0,
        });
        return true;
      },

      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: "economy-ui-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        lastDailyTaskDate: state.lastDailyTaskDate,
        lastLoginBonusDate: state.lastLoginBonusDate,
        starterCapitalGranted: state.starterCapitalGranted,
        activeDates: state.activeDates,
        frozenDates: state.frozenDates,
        coinsEarnedByDay: state.coinsEarnedByDay,
        streakFreezes: state.streakFreezes,
        onboardingFreezesGranted: state.onboardingFreezesGranted,
        lastStreakDayRewardDate: state.lastStreakDayRewardDate,
        pendingFreezeSaveAck: state.pendingFreezeSaveAck,
        pendingRepairOffer: state.pendingRepairOffer,
        previousStreakBeforeBreak: state.previousStreakBeforeBreak,
        lastRepairOfferedAt: state.lastRepairOfferedAt,
        recentActivityHours: state.recentActivityHours,
        lastSessionAt: state.lastSessionAt,
        lessonXPMultiplier: state.lessonXPMultiplier,
        activeBoosts: state.activeBoosts,
        weeklyShieldUntil: state.weeklyShieldUntil,
        monthlyShieldUntil: state.monthlyShieldUntil,
        eliteRevivalCount: state.eliteRevivalCount,
        // NOTE: pendingLevelUp and pendingSessionBonus are NOT persisted (session-only)
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.recentActivityHours)) state.recentActivityHours = [];
        if (!Array.isArray(state.activeDates)) state.activeDates = [];
        if (!Array.isArray(state.frozenDates)) state.frozenDates = [];
        if (typeof state.streakFreezes !== "number") state.streakFreezes = 0;
        if (typeof state.onboardingFreezesGranted !== "boolean") state.onboardingFreezesGranted = false;
        if (typeof state.lastStreakDayRewardDate !== "string" && state.lastStreakDayRewardDate !== null) state.lastStreakDayRewardDate = null;
        if (typeof state.pendingFreezeSaveAck !== "boolean") state.pendingFreezeSaveAck = false;
        if (typeof state.pendingRepairOffer !== "boolean") state.pendingRepairOffer = false;
        if (typeof state.previousStreakBeforeBreak !== "number") state.previousStreakBeforeBreak = 0;
        if (typeof state.lastRepairOfferedAt !== "string" && state.lastRepairOfferedAt !== null) state.lastRepairOfferedAt = null;
        if (!Array.isArray(state.activeBoosts)) state.activeBoosts = [];

        // Cold-start streak hydration: derive the current streak from the
        // persisted activeDates + frozenDates and seed the React Query cache.
        // Without this, guests (whose useStreak() server query is disabled)
        // would see "0" in the header on every cold start until the next
        // daily activity fires completeDailyTask.
        try {
          const derived = deriveStreakFromDates(state.activeDates, state.frozenDates);
          // Only seed if the cache is empty — don't clobber a freshly-fetched
          // server value that may have arrived first.
          const existing = queryClient.getQueryData<StreakState | null>(STREAK_QUERY_KEY);
          if (!existing) {
            queryClient.setQueryData<StreakState | null>(STREAK_QUERY_KEY, {
              currentStreak: derived,
              longestStreak: derived,
              lastActiveDate: state.activeDates[state.activeDates.length - 1] ?? null,
            });
          }
        } catch { /* non-fatal */ }
      },
    }
  )
);

registerLocalStore('economy-ui-store-v1', useEconomyUIStore, 'economy-ui-store-v1');
