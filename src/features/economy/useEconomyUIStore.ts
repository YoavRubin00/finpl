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
import { logLevelUp, logStreakMilestone } from "../../utils/fbEvents";

const STREAK_MILESTONE_DAYS: ReadonlySet<number> = new Set([3, 7, 14, 30, 60, 90]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ninetyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

function daysBetween(dateA: string, dateB: string): number {
  return Math.floor(
    (new Date(dateB + "T00:00:00").getTime() - new Date(dateA + "T00:00:00").getTime()) / 86400000
  );
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
  streakFreezes: number;     // owned freeze items count
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
  streakFreezes: 0,
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

function fireEconomyDelta(delta: {
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
    .then((res) => queryClient.setQueryData<Economy | null>(economyQueryKey, res.economy))
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
        // Server-backed: fire delta
        fireEconomyDelta({ xpDelta: finalAmount });
        // Also upsert inventory (best-effort with optimistic values)
        const authId = useAuthStore.getState().email;
        if (authId) {
          const coins = cached?.coins ?? 0;
          const gems = cached?.gems ?? 0;
          upsertInventory(authId, { xp: newXP, coins, gems }).catch(() => {});
        }
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
        }
        fireEconomyDelta({ coinsDelta: finalAmount });
        const authId = useAuthStore.getState().email;
        if (authId) {
          const cached = queryClient.getQueryData<Economy | null>(economyQueryKey);
          const xp = cached?.xp ?? 0;
          const coins = (cached?.coins ?? 0) + finalAmount;
          const gems = cached?.gems ?? 0;
          upsertInventory(authId, { xp, coins, gems }).catch(() => {});
          if (source) {
            import('../../db/sync/syncCoinEvents')
              .then((m) => m.logCoinGrant(authId, finalAmount, source))
              .catch(() => { /* non-fatal */ });
          }
        }
      },

      addGems: (amount: number) => {
        if (amount <= 0) return;
        fireEconomyDelta({ gemsDelta: amount });
        const authId = useAuthStore.getState().email;
        if (authId) {
          const cached = queryClient.getQueryData<Economy | null>(economyQueryKey);
          const xp = cached?.xp ?? 0;
          const coins = cached?.coins ?? 0;
          const gems = (cached?.gems ?? 0) + amount;
          upsertInventory(authId, { xp, coins, gems }).catch(() => {});
        }
      },

      completeDailyTask: () => {
        const { lastDailyTaskDate, streakFreezes, activeDates, frozenDates, weeklyShieldUntil, monthlyShieldUntil } = get();
        const cached = queryClient.getQueryData<Economy | null>(economyQueryKey);
        const streak = cached ? 0 : 0; // streak is now server-backed via useStreak
        // Read streak from local activeDates (source of truth for UI store)
        const derivedStreak = (() => {
          const dateSet = new Set([...activeDates, ...frozenDates]);
          const today2 = todayISO();
          const yest2 = yesterdayISO();
          let cursor: Date | null = dateSet.has(today2) ? new Date() : (dateSet.has(yest2) ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })() : null);
          let count = 0;
          while (cursor) {
            const iso = cursor.toISOString().slice(0, 10);
            if (!dateSet.has(iso)) break;
            count++;
            cursor.setDate(cursor.getDate() - 1);
            if (count > 365) break;
          }
          return count;
        })();

        const today = todayISO();
        if (lastDailyTaskDate === today) return;

        const isConsecutiveDay = lastDailyTaskDate === yesterdayISO();
        const gap = lastDailyTaskDate ? daysBetween(lastDailyTaskDate, today) : 999;
        const canFreeze = gap === 2 && streakFreezes > 0;
        const now = Date.now();
        const weeklyShieldActive = weeklyShieldUntil != null && weeklyShieldUntil > now;
        const monthlyShieldActive = monthlyShieldUntil != null && monthlyShieldUntil > now;
        const canWeeklyShield = weeklyShieldActive && gap >= 2 && gap <= 4;
        const canMonthlyShield = monthlyShieldActive && gap >= 2 && gap <= 8;
        const canShield = !canFreeze && (canWeeklyShield || canMonthlyShield);

        let newStreak: number;
        let freezeConsumed = false;
        let streakBroke = false;
        if (isConsecutiveDay) {
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

        const streakBonus = (isConsecutiveDay || freezeConsumed) ? STREAK_BONUS_BASE_XP * newStreak : 0;
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

        // Log streak milestone analytics
        if (newStreak > streak && STREAK_MILESTONE_DAYS.has(newStreak)) {
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

        const derivedStreak = (() => {
          const dateSet = new Set([...activeDates, ...frozenDates]);
          const today2 = todayISO();
          const yest2 = yesterdayISO();
          let cursor: Date | null = dateSet.has(today2) ? new Date() : (dateSet.has(yest2) ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })() : null);
          let count = 0;
          while (cursor) {
            const iso = cursor.toISOString().slice(0, 10);
            if (!dateSet.has(iso)) break;
            count++;
            cursor.setDate(cursor.getDate() - 1);
            if (count > 365) break;
          }
          return count;
        })();

        const lastActive = lastDailyTaskDate ?? lastLoginBonusDate;
        const isConsecutiveDay = lastActive === yesterdayISO();
        const gap = lastActive ? daysBetween(lastActive, today) : 999;
        const canFreeze = gap === 2 && streakFreezes > 0;
        const now = Date.now();
        const weeklyShieldActive = weeklyShieldUntil != null && weeklyShieldUntil > now;
        const monthlyShieldActive = monthlyShieldUntil != null && monthlyShieldUntil > now;
        const canWeeklyShield = weeklyShieldActive && gap >= 2 && gap <= 4;
        const canMonthlyShield = monthlyShieldActive && gap >= 2 && gap <= 8;
        const canShield = !canFreeze && (canWeeklyShield || canMonthlyShield);

        let newStreak: number;
        let freezeConsumed = false;
        let streakBroke = false;
        if (isConsecutiveDay) {
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
        streakFreezes: state.streakFreezes,
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
        if (typeof state.pendingFreezeSaveAck !== "boolean") state.pendingFreezeSaveAck = false;
        if (typeof state.pendingRepairOffer !== "boolean") state.pendingRepairOffer = false;
        if (typeof state.previousStreakBeforeBreak !== "number") state.previousStreakBeforeBreak = 0;
        if (typeof state.lastRepairOfferedAt !== "string" && state.lastRepairOfferedAt !== null) state.lastRepairOfferedAt = null;
        if (!Array.isArray(state.activeBoosts)) state.activeBoosts = [];
      },
    }
  )
);

registerLocalStore('economy-ui-store-v1', useEconomyUIStore, 'economy-ui-store-v1');
