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

interface EconomyState {
  xp: number;
  coins: number;
  gems: number;
  /**
   * Paper-trading simulator currency. Kept separate from `coins` (game economy)
   * so stock buys don't drain shop/repair/streak budgets. Server is authoritative
   * — local mutations are optimistic; reconciled on each `/api/sync/profile` GET
   * and on every successful `/api/trading/trade` response.
   */
  virtualBalance: number;
  streak: number;
  lastDailyTaskDate: string | null; // ISO date string "YYYY-MM-DD"
  lastLoginBonusDate: string | null;
  starterCapitalGranted: boolean;
  pendingLevelUp: number | null; // new level number, null = none pending
  activeDates: string[]; // ISO dates when user completed a task (bounded to 90 days)
  frozenDates: string[]; // ISO dates when a streak freeze was auto-consumed
  streakFreezes: number; // owned freeze items count
  pendingFreezeSaveAck: boolean; // true when freeze was consumed, cleared on modal dismiss
  // Streak Repair (US-004), offered ONCE per break if prev streak >= 3
  pendingRepairOffer: boolean;
  previousStreakBeforeBreak: number; // snapshot of streak immediately before it reset to 1
  lastRepairOfferedAt: string | null; // ISO date, prevents repeat offers for the same break
  // US-007: track last 14 days' hour-of-day of activity (for personalized notification time)
  recentActivityHours: number[];
  // Session stacking bonus (Playtika/Slotomania pattern) — rewards multiple
  // returns within the same day with escalating coin bonuses.
  lastSessionAt: number | null; // timestamp of last bonus award (epoch ms)
  pendingSessionBonus: { coins: number; hoursAway: number } | null; // surfaces a one-shot UI nudge
  // Hearts-full XP boost (Duolingo "use them while you have them" pattern).
  // When 1.25, the next lesson XP award is multiplied by 1.25 and the value resets.
  lessonXPMultiplier: number;
  // Active temporary boosts purchased from the shop (Coin Master "Power Hour"
  // pattern). Each entry has its own expiresAt — `getActiveBoostMultipliers()`
  // sums them and `cleanupExpiredBoosts()` is called transparently on read.
  activeBoosts: import('../shop/types').ActiveBoost[];
  // Streak Insurance — whale-tier protection beyond the regular streak-freeze.
  // weeklyShieldUntil / monthlyShieldUntil = epoch ms. Allows N missed days
  // within the active window to NOT break streak. Used in `completeDailyTask`
  // and `awardLoginBonus` break-detection.
  weeklyShieldUntil: number | null;
  monthlyShieldUntil: number | null;
  /** Number of one-shot Elite revivals owned (each restores a broken streak up to 60 days back). */
  eliteRevivalCount: number;

  addXP: (amount: number, source: XPSource) => void;
  /**
   * Add coins to balance. Optional `source` enables server-side dividend
   * tracking — pass 'lesson' / 'quiz' / 'daily-quest' to make these coins
   * count toward the referral dividend pool. Other sources (or omitted)
   * still credit the local balance but are NOT eligible for the 5% dividend.
   */
  addCoins: (amount: number, source?: import('../social/referralConstants').CoinEventSource) => void;
  addGems: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
  /** Optimistic debit of paper-trading currency. Returns false if balance is too low. */
  spendVirtual: (amount: number) => boolean;
  /** Optimistic credit (sell return). Always succeeds — clamped to non-negative input. */
  creditVirtual: (amount: number) => void;
  /** Hard-set the virtual balance (called on profile sync GET and on trade-API responses). */
  setVirtualBalance: (value: number) => void;
  completeDailyTask: () => void;
  awardLoginBonus: () => void;
  /**
   * Awards a stacking coin bonus for repeat sessions within the same day.
   * Stack tiers (hours since last award): 1h=50, 2h=120, 4h=300, 8h=800, 12h+=2000.
   * Returns the awarded amount (0 if too soon).
   * Modeled on Playtika/Slotomania hourly login stacking pattern.
   */
  awardSessionStackingBonus: () => number;
  /** Clear the session bonus banner once the user has seen it. */
  dismissSessionBonus: () => void;
  /** Set the next-lesson XP multiplier (1.25 when hearts are full). Idempotent. */
  setLessonXPMultiplier: (value: number) => void;
  /** Activate a shop-purchased booster. `multipliers` are kept on the boost
   *  itself so we don't hard-code item ids in the store. */
  activateBoost: (
    id: string,
    durationMs: number,
    multipliers: { xpMultiplier?: number; coinMultiplier?: number; questRewardMultiplier?: number },
  ) => void;
  /** Returns combined multipliers from all active (un-expired) boosts. */
  getActiveBoostMultipliers: () => { xp: number; coins: number; questReward: number };
  /** Activate Streak Insurance from a shop purchase. */
  activateStreakShield: (kind: 'week' | 'month') => void;
  /** Add an Elite Revival to the inventory (purchased once-per-event). */
  grantEliteRevival: () => void;
  /** Consume one Elite Revival to restore a broken streak. Returns true on success. */
  useEliteRevival: () => boolean;
  grantStarterCapital: () => boolean;
  dismissLevelUp: () => void;
  addStreakFreezes: (count: number) => void;
  dismissFreezeSaveAck: () => void;
  repairStreak: (source: "gems" | "ad") => boolean; // true = succeeded
  dismissRepairOffer: () => void;
}

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

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      xp: 0,
      coins: 0,
      gems: 0,
      virtualBalance: 100000, // matches server DEFAULT in 0004_virtual_balance.sql
      streak: 0,
      lastDailyTaskDate: null,
      lastLoginBonusDate: null,
      starterCapitalGranted: false,
      pendingLevelUp: null,
      activeDates: [],
      frozenDates: [],
      streakFreezes: 0,
      pendingFreezeSaveAck: false,
      pendingRepairOffer: false,
      previousStreakBeforeBreak: 0,
      lastRepairOfferedAt: null,
      recentActivityHours: [],
      lastSessionAt: null,
      pendingSessionBonus: null,
      lessonXPMultiplier: 1.0,
      activeBoosts: [],
      weeklyShieldUntil: null,
      monthlyShieldUntil: null,
      eliteRevivalCount: 0,

      addXP: (amount: number, _source: XPSource) => {
        if (amount <= 0) return;
        // Hearts-full boost: when multiplier is set (1.25), apply it ONCE for
        // lesson-related sources, then reset. Other sources (daily task, login)
        // are unaffected — the boost is meant to incentivize active lessons.
        const mult = get().lessonXPMultiplier;
        const isLessonSource = _source === 'lesson_complete' || _source === 'quiz_correct';
        let finalAmount = amount;
        if (mult > 1.0 && isLessonSource) {
          finalAmount = Math.round(amount * mult);
          set({ lessonXPMultiplier: 1.0 });
        }
        // Active shop-purchased boosters (XP×2, Mega Boost, Weekend Boost).
        // Stack multiplicatively on top of the hearts-full bonus.
        if (isLessonSource) {
          const boostXp = get().getActiveBoostMultipliers().xp;
          if (boostXp > 1.0) finalAmount = Math.round(finalAmount * boostXp);
        }
        const prevXP = get().xp;
        const prevLevel = getLevelFromXP(prevXP);
        const prevLayer = getPyramidLayer(prevXP);
        set((state) => ({ xp: state.xp + finalAmount }));
        const { xp, coins, gems } = get();
        const newLevel = getLevelFromXP(xp);
        const newLayer = getPyramidLayer(xp);
        if (newLevel > prevLevel) {
          set({ pendingLevelUp: newLevel });
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
              trigger: null, // immediate
            }).catch(() => {});
          }
        }
        const authId = useAuthStore.getState().email;
        if (authId) upsertInventory(authId, { xp, coins, gems }).catch(() => {});
      },

      dismissLevelUp: () => set({ pendingLevelUp: null }),

      addCoins: (amount: number, source) => {
        if (amount <= 0) return;
        // Apply active seasonal-event multiplier (e.g. יום העצמאות = 1.25x) to
        // dividend-eligible learning sources only. Other sources (referral
        // signup bonus, login stacking, etc.) keep their fixed magnitudes so
        // the economy stays predictable and the dividend pool sums cleanly.
        let finalAmount = amount;
        if (source === 'lesson' || source === 'quiz' || source === 'daily-quest') {
          // Lazy import to avoid pulling the calendar into the persist hot path.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getActiveRewardMultiplier } = require('../seasonal-events/seasonalEvents') as typeof import('../seasonal-events/seasonalEvents');
          const seasonalMult = getActiveRewardMultiplier();
          if (seasonalMult > 1.0) finalAmount = Math.round(finalAmount * seasonalMult);
          // Active shop-purchased boosters (Coins×2, Mega Boost). Stack on top
          // of seasonal events so a Mega Boost on Yom HaAtzmaut hits 2.5×.
          const boostCoins = get().getActiveBoostMultipliers().coins;
          if (boostCoins > 1.0) finalAmount = Math.round(finalAmount * boostCoins);
        }
        set((state) => ({ coins: state.coins + finalAmount }));
        const { xp, coins, gems } = get();
        const authId = useAuthStore.getState().email;
        if (authId) {
          upsertInventory(authId, { xp, coins, gems }).catch(() => {});
          // If the caller tagged this grant with a dividend-eligible source,
          // also log it to the server so the referral dividend pool can sum it.
          // Fire-and-forget — failures don't affect the local balance.
          if (source) {
            import('../../db/sync/syncCoinEvents')
              .then((m) => m.logCoinGrant(authId, finalAmount, source))
              .catch(() => { /* non-fatal */ });
          }
        }
      },

      addGems: (amount: number) => {
        if (amount <= 0) return;
        set((state) => ({ gems: state.gems + amount }));
        const { xp, coins, gems } = get();
        const authId = useAuthStore.getState().email;
        if (authId) upsertInventory(authId, { xp, coins, gems }).catch(() => {});
      },

      spendCoins: (amount: number): boolean => {
        if (amount <= 0) return false;
        let success = false;
        set((state) => {
          if (state.coins < amount) return state;
          success = true;
          return { coins: state.coins - amount };
        });
        return success;
      },

      spendGems: (amount: number): boolean => {
        if (amount <= 0) return false;
        let success = false;
        set((state) => {
          if (state.gems < amount) return state;
          success = true;
          return { gems: state.gems - amount };
        });
        return success;
      },

      spendVirtual: (amount: number): boolean => {
        if (amount <= 0) return false;
        let success = false;
        set((state) => {
          if (state.virtualBalance < amount) return state;
          success = true;
          return { virtualBalance: state.virtualBalance - amount };
        });
        return success;
      },

      creditVirtual: (amount: number) => {
        if (amount <= 0) return;
        set((state) => ({ virtualBalance: state.virtualBalance + amount }));
      },

      setVirtualBalance: (value: number) => {
        if (!Number.isFinite(value) || value < 0) return;
        set({ virtualBalance: value });
      },

      completeDailyTask: () => {
        const { lastDailyTaskDate, streak, streakFreezes, activeDates, frozenDates, weeklyShieldUntil, monthlyShieldUntil } = get();
        const today = todayISO();

        // Idempotent: already completed today
        if (lastDailyTaskDate === today) return;

        const isConsecutiveDay = lastDailyTaskDate === yesterdayISO();
        const gap = lastDailyTaskDate ? daysBetween(lastDailyTaskDate, today) : 999;
        const canFreeze = gap === 2 && streakFreezes > 0; // missed exactly 1 day
        // Streak Insurance — shield-saved breaks (Whale-tier protection).
        // Weekly shield covers up to 3 missed days within the active window;
        // monthly covers up to 7. Shields are time-based (not consumed per use).
        const now = Date.now();
        const weeklyShieldActive = weeklyShieldUntil != null && weeklyShieldUntil > now;
        const monthlyShieldActive = monthlyShieldUntil != null && monthlyShieldUntil > now;
        const canWeeklyShield = weeklyShieldActive && gap >= 2 && gap <= 4;     // 1–3 missed days
        const canMonthlyShield = monthlyShieldActive && gap >= 2 && gap <= 8;   // 1–7 missed days
        const canShield = !canFreeze && (canWeeklyShield || canMonthlyShield);

        let newStreak: number;
        let freezeConsumed = false;
        let streakBroke = false;
        if (isConsecutiveDay) {
          newStreak = streak + 1;
        } else if (canFreeze) {
          newStreak = streak + 1;
          freezeConsumed = true;
        } else if (canShield) {
          newStreak = streak + 1; // shield saves the break — streak continues
        } else {
          newStreak = 1;
          streakBroke = streak >= 3; // repair offer only for meaningful breaks
        }

        const streakBonus = (isConsecutiveDay || freezeConsumed) ? STREAK_BONUS_BASE_XP * newStreak : 0;

        // Streak milestone bonuses
        let milestoneBonus = 0;
        if (newStreak === 7) milestoneBonus = STREAK_7_BONUS_XP;
        if (newStreak > 0 && newStreak % 30 === 0) milestoneBonus = STREAK_30_BONUS_XP;

        // 7-day milestone: auto-grant 1 streak freeze (welcome to Streak Society)
        const grantFreeze = newStreak === 7;

        const updatedActiveDates = trimDates([...activeDates, today]);
        const updatedFrozenDates = freezeConsumed
          ? trimDates([...frozenDates, yesterdayISO()])
          : trimDates(frozenDates);

        const netFreezeDelta = (grantFreeze ? 1 : 0) - (freezeConsumed ? 1 : 0);

        set((state) => ({
          xp: state.xp + DAILY_TASK_XP + streakBonus + milestoneBonus,
          coins: state.coins + DAILY_TASK_COINS,
          streak: newStreak,
          lastDailyTaskDate: today,
          activeDates: updatedActiveDates,
          frozenDates: updatedFrozenDates,
          streakFreezes: state.streakFreezes + netFreezeDelta,
          ...(freezeConsumed ? { pendingFreezeSaveAck: true } : {}),
          ...(streakBroke && state.lastRepairOfferedAt !== today
            ? { pendingRepairOffer: true, previousStreakBeforeBreak: streak }
            : {}),
          // US-007: record current hour-of-day for personalized notification scheduling
          recentActivityHours: [...state.recentActivityHours.slice(-13), new Date().getHours()],
        }));

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
        const { lastLoginBonusDate, lastDailyTaskDate, streak, streakFreezes, activeDates, frozenDates, weeklyShieldUntil, monthlyShieldUntil } = get();
        const today = todayISO();
        if (lastLoginBonusDate === today) return;

        // Update streak on daily login (same logic as completeDailyTask)
        const lastActive = lastDailyTaskDate ?? lastLoginBonusDate;
        const isConsecutiveDay = lastActive === yesterdayISO();
        const gap = lastActive ? daysBetween(lastActive, today) : 999;
        const canFreeze = gap === 2 && streakFreezes > 0;
        // Streak Insurance — same logic as completeDailyTask, mirrored here.
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
          newStreak = streak + 1;
        } else if (lastActive === today) {
          newStreak = streak;
        } else if (canFreeze) {
          newStreak = streak + 1;
          freezeConsumed = true;
        } else if (canShield) {
          newStreak = streak + 1;
        } else {
          newStreak = 1;
          streakBroke = streak >= 3;
        }

        // 7-day milestone: auto-grant 1 streak freeze (same as completeDailyTask)
        // Only grant if streak actually increased (not if awarded for same-day login)
        const grantFreeze = newStreak === 7 && streak !== 7;

        const updatedActiveDates = trimDates([...activeDates, today]);
        const updatedFrozenDates = freezeConsumed
          ? trimDates([...frozenDates, yesterdayISO()])
          : trimDates(frozenDates);

        const netFreezeDelta = (grantFreeze ? 1 : 0) - (freezeConsumed ? 1 : 0);

        set((state) => ({
          xp: state.xp + LOGIN_BONUS_XP,
          streak: newStreak,
          lastLoginBonusDate: today,
          activeDates: updatedActiveDates,
          frozenDates: updatedFrozenDates,
          streakFreezes: state.streakFreezes + netFreezeDelta,
          ...(freezeConsumed ? { pendingFreezeSaveAck: true } : {}),
          ...(streakBroke && state.lastRepairOfferedAt !== today
            ? { pendingRepairOffer: true, previousStreakBeforeBreak: streak }
            : {}),
          // US-007: record current hour-of-day for personalized notification scheduling
          recentActivityHours: [...state.recentActivityHours.slice(-13), new Date().getHours()],
        }));
      },

      addStreakFreezes: (count: number) => {
        if (count <= 0) return;
        set((state) => ({ streakFreezes: state.streakFreezes + count }));
      },
      dismissFreezeSaveAck: () => {
        set({ pendingFreezeSaveAck: false });
      },

      repairStreak: (source: "gems" | "ad") => {
        const { pendingRepairOffer, previousStreakBeforeBreak, gems } = get();
        if (!pendingRepairOffer || previousStreakBeforeBreak < 3) return false;
        if (source === "gems") {
          const REPAIR_COST = 30;
          if (gems < REPAIR_COST) return false;
          set((state) => ({ gems: state.gems - REPAIR_COST }));
        }
        // Both paths: restore streak to previous value and mark today active
        const today = todayISO();
        set((state) => ({
          streak: previousStreakBeforeBreak,
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
        set((state) => ({
          coins: state.coins + 2500,
          starterCapitalGranted: true,
        }));
        return true;
      },

      awardSessionStackingBonus: (): number => {
        const now = Date.now();
        const last = get().lastSessionAt;
        // First session ever / day — track but don't award (login bonus handles it).
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
        else return 0; // too soon — don't update timestamp either, prevents farming
        set((state) => ({
          coins: state.coins + bonus,
          lastSessionAt: now,
          pendingSessionBonus: { coins: bonus, hoursAway: Math.round(hoursAway) },
        }));
        return bonus;
      },

      dismissSessionBonus: () => {
        set({ pendingSessionBonus: null });
      },

      setLessonXPMultiplier: (value: number) => {
        // Clamp to safe range — only 1.0 (off) or 1.25 (hearts-full bonus) are valid today.
        const safe = value > 1.0 ? Math.min(value, 1.5) : 1.0;
        if (get().lessonXPMultiplier === safe) return; // idempotent — avoid render loops
        set({ lessonXPMultiplier: safe });
      },

      activateBoost: (id, durationMs, multipliers) => {
        const now = Date.now();
        // Drop any expired boost AND any prior copy of this same id (stacking
        // the same booster just refreshes the timer — Brawl Stars pattern,
        // not Coin Master's true stacking which can balloon out of control).
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
        // If anything was filtered out, persist the cleanup back to state lazily
        if (active.length !== get().activeBoosts.length) {
          set({ activeBoosts: active });
        }
        // Multiplicative stacking — XP×2 + Coins×2 + Mega gives 2×2×2 (rare). Most
        // of the time only one is active. Pure 1.0 if no active boost.
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
          // Extend if already active — never shorten
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
        // Restore broken streak from snapshot — same path as repairStreak.
        const prevStreak = get().previousStreakBeforeBreak;
        if (prevStreak < 1) {
          // Nothing to restore. Don't burn the revival.
          return false;
        }
        set({
          eliteRevivalCount: count - 1,
          streak: prevStreak,
          pendingRepairOffer: false,
          previousStreakBeforeBreak: 0,
        });
        return true;
      },
    }),
    {
      name: "economy-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        xp: state.xp,
        coins: state.coins,
        gems: state.gems,
        virtualBalance: state.virtualBalance,
        streak: state.streak,
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Defensive defaults: fields added after v1 persist may be undefined for existing users
        if (typeof state.virtualBalance !== 'number' || !Number.isFinite(state.virtualBalance)) {
          // First open after the virtual_balance migration — server will overwrite
          // on next /api/sync/profile GET. Until then, mirror the server DEFAULT.
          state.virtualBalance = 100000;
        }
        if (!Array.isArray(state.recentActivityHours)) state.recentActivityHours = [];
        if (!Array.isArray(state.activeDates)) state.activeDates = [];
        if (!Array.isArray(state.frozenDates)) state.frozenDates = [];
        if (typeof state.streakFreezes !== "number") state.streakFreezes = 0;
        if (typeof state.pendingFreezeSaveAck !== "boolean") state.pendingFreezeSaveAck = false;
        if (typeof state.pendingRepairOffer !== "boolean") state.pendingRepairOffer = false;
        if (typeof state.previousStreakBeforeBreak !== "number") state.previousStreakBeforeBreak = 0;
        if (typeof state.lastRepairOfferedAt !== "string" && state.lastRepairOfferedAt !== null) state.lastRepairOfferedAt = null;
        // Migration: backfill activeDates for existing users who have a streak but no history
        if (
          state.streak > 0 &&
          state.lastDailyTaskDate &&
          (!state.activeDates || state.activeDates.length === 0)
        ) {
          const dates: string[] = [];
          const last = new Date(state.lastDailyTaskDate + "T00:00:00");
          for (let i = 0; i < Math.min(state.streak, 90); i++) {
            const d = new Date(last);
            d.setDate(last.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
          }
          state.activeDates = dates;
        }
        // Ensure arrays exist (first-time upgrade from older store version)
        if (!state.activeDates) state.activeDates = [];
        if (!state.frozenDates) state.frozenDates = [];
        if (state.streakFreezes == null) state.streakFreezes = 0;

        // Reconcile streak from activeDates. The two are maintained separately
        // by completeDailyTask / awardLoginBonus / repair flows, and a corrupted
        // run (interrupted update, partial sync) could leave them out of sync —
        // user reported "calendar shows 7 active days but profile shows streak=3".
        // Rebuild streak from the source-of-truth (activeDates ∪ frozenDates) on
        // every rehydrate so the two surfaces always agree.
        if (state.activeDates && state.activeDates.length > 0) {
          const dateSet = new Set([...state.activeDates, ...(state.frozenDates ?? [])]);
          const today = new Date().toISOString().slice(0, 10);
          const yest = (() => {
            const d = new Date(); d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })();
          // Walk back from today (or yesterday if today not yet in set) and count
          // consecutive days. Stop on the first gap.
          let cursor = dateSet.has(today) ? new Date() : (dateSet.has(yest) ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })() : null);
          let derived = 0;
          while (cursor) {
            const iso = cursor.toISOString().slice(0, 10);
            if (!dateSet.has(iso)) break;
            derived += 1;
            cursor.setDate(cursor.getDate() - 1);
            if (derived > 365) break; // hard cap, defensive
          }
          if (derived !== state.streak) {
            state.streak = derived;
          }
        }
      },
    }
  )
);
