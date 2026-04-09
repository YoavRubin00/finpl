import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { XPSource } from "../../types/economy";
import {
  DAILY_TASK_XP,
  DAILY_TASK_COINS,
  STREAK_BONUS_BASE_XP,
  LOGIN_BONUS_XP,
  FEED_SCROLL_XP,
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
  streak: number;
  lastDailyTaskDate: string | null; // ISO date string "YYYY-MM-DD"
  lastLoginBonusDate: string | null;
  lastFeedScrollDate: string | null;
  starterCapitalGranted: boolean;
  pendingLevelUp: number | null; // new level number, null = none pending

  addXP: (amount: number, source: XPSource) => void;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
  completeDailyTask: () => void;
  awardLoginBonus: () => void;
  awardFeedScroll: () => void;
  grantStarterCapital: () => boolean;
  dismissLevelUp: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      xp: 0,
      coins: 0,
      gems: 0,
      streak: 0,
      lastDailyTaskDate: null,
      lastLoginBonusDate: null,
      lastFeedScrollDate: null,
      starterCapitalGranted: false,
      pendingLevelUp: null,

      addXP: (amount: number, _source: XPSource) => {
        if (amount <= 0) return;
        const prevXP = get().xp;
        const prevLevel = getLevelFromXP(prevXP);
        const prevLayer = getPyramidLayer(prevXP);
        set((state) => ({ xp: state.xp + amount }));
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
                body: "הגעת לשלב 2 — בואו נגלה מה מחכה לכם בעולם ההשקעות!",
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

      addCoins: (amount: number) => {
        if (amount <= 0) return;
        set((state) => ({ coins: state.coins + amount }));
        const { xp, coins, gems } = get();
        const authId = useAuthStore.getState().email;
        if (authId) upsertInventory(authId, { xp, coins, gems }).catch(() => {});
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
        const { coins } = get();
        if (coins < amount) return false;
        set((state) => ({ coins: state.coins - amount }));
        return true;
      },

      spendGems: (amount: number): boolean => {
        if (amount <= 0) return false;
        const { gems } = get();
        if (gems < amount) return false;
        set((state) => ({ gems: state.gems - amount }));
        return true;
      },

      completeDailyTask: () => {
        const { lastDailyTaskDate, streak } = get();
        const today = todayISO();

        // Idempotent: already completed today
        if (lastDailyTaskDate === today) return;

        const isConsecutiveDay = lastDailyTaskDate === yesterdayISO();
        const newStreak = isConsecutiveDay ? streak + 1 : 1;
        const streakBonus = isConsecutiveDay ? STREAK_BONUS_BASE_XP * newStreak : 0;

        // Streak milestone bonuses
        let milestoneBonus = 0;
        if (newStreak === 7) milestoneBonus = STREAK_7_BONUS_XP;
        if (newStreak > 0 && newStreak % 30 === 0) milestoneBonus = STREAK_30_BONUS_XP;

        set((state) => ({
          xp: state.xp + DAILY_TASK_XP + streakBonus + milestoneBonus,
          coins: state.coins + DAILY_TASK_COINS,
          streak: newStreak,
          lastDailyTaskDate: today,
        }));

        // Cancel today's streak reminder — user already completed the daily task
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
        const { lastLoginBonusDate, lastDailyTaskDate, streak } = get();
        const today = todayISO();
        if (lastLoginBonusDate === today) return;

        // Update streak on daily login (same logic as completeDailyTask)
        const lastActive = lastDailyTaskDate ?? lastLoginBonusDate;
        const isConsecutiveDay = lastActive === yesterdayISO();
        const newStreak = isConsecutiveDay ? streak + 1 : (lastActive === today ? streak : 1);

        set((state) => ({
          xp: state.xp + LOGIN_BONUS_XP,
          streak: newStreak,
          lastLoginBonusDate: today,
        }));
      },

      awardFeedScroll: () => {
        const { lastFeedScrollDate } = get();
        const today = todayISO();
        if (lastFeedScrollDate === today) return;
        set((state) => ({
          xp: state.xp + FEED_SCROLL_XP,
          lastFeedScrollDate: today,
        }));
      },

      grantStarterCapital: (): boolean => {
        const { starterCapitalGranted } = get();
        if (starterCapitalGranted) return false;
        set((state) => ({
          coins: state.coins + 500,
          starterCapitalGranted: true,
        }));
        return true;
      },
    }),
    {
      name: "economy-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        xp: state.xp,
        coins: state.coins,
        gems: state.gems,
        streak: state.streak,
        lastDailyTaskDate: state.lastDailyTaskDate,
        lastLoginBonusDate: state.lastLoginBonusDate,
        lastFeedScrollDate: state.lastFeedScrollDate,
        starterCapitalGranted: state.starterCapitalGranted,
      }),
    }
  )
);
