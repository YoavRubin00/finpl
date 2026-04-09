// ---------------------------------------------------------------------------
// PRD 32 — US-005: Wealth Network — Referral Store
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReferralState, ReferredFriend } from "./referralTypes";
import {
  generateReferralCode,
  DIAMOND_CHEST_GEMS,
  DIVIDEND_PERCENT,
  generateMockFriends,
  getISODateKey,
} from "./referralData";
import { useEconomyStore } from "../economy/useEconomyStore";

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      referralCode: "",
      referredFriends: [],
      totalDividendXP: 0,
      totalDividendCoins: 0,
      hasClaimedDiamondChest: {},
      lastDividendDate: "",

      generateCode: () => {
        const state = get();
        if (state.referralCode) return; // already generated
        set({ referralCode: generateReferralCode() });
      },

      addReferredFriend: (friend: ReferredFriend) => {
        set((s) => ({
          referredFriends: [...s.referredFriends, friend],
        }));
      },

      claimDiamondChest: (friendId: string) => {
        const state = get();
        if (state.hasClaimedDiamondChest[friendId]) return;

        useEconomyStore.getState().addGems(DIAMOND_CHEST_GEMS);

        set((s) => ({
          hasClaimedDiamondChest: {
            ...s.hasClaimedDiamondChest,
            [friendId]: true,
          },
        }));
      },

      canCollectDividend: () => {
        const state = get();
        const today = getISODateKey();
        return state.lastDividendDate !== today;
      },

      collectDividend: () => {
        const state = get();
        const today = getISODateKey();
        if (state.lastDividendDate === today) return; // already collected today

        const totalYesterdayXP = state.referredFriends.reduce(
          (sum, f) => sum + f.yesterdayXP,
          0
        );
        const totalYesterdayGold = state.referredFriends.reduce(
          (sum, f) => sum + f.yesterdayGold,
          0
        );
        const goldDividend = Math.floor(totalYesterdayGold * DIVIDEND_PERCENT);
        if (goldDividend <= 0) return;

        const economy = useEconomyStore.getState();
        economy.addCoins(goldDividend);
        set({
          totalDividendXP: state.totalDividendXP, // unchanged
          totalDividendCoins: state.totalDividendCoins + goldDividend,
          lastDividendDate: today,
        });
      },

      refreshDailyActivity: () => {
        const state = get();
        const today = getISODateKey();
        // Only refresh when entering a new day and user hasn't collected yet
        if (state.lastDividendDate === today) return;

        // Simulate friends earning new XP/gold yesterday (mock)
        set({
          referredFriends: state.referredFriends.map((f) => ({
            ...f,
            yesterdayXP: Math.floor(Math.random() * 300) + 50,
            yesterdayGold: Math.floor(Math.random() * 400) + 100,
          })),
        });
      },
    }),
    {
      name: "referral-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        referralCode: state.referralCode,
        referredFriends: state.referredFriends,
        totalDividendXP: state.totalDividendXP,
        totalDividendCoins: state.totalDividendCoins,
        hasClaimedDiamondChest: state.hasClaimedDiamondChest,
        lastDividendDate: state.lastDividendDate,
      }),
    }
  )
);

// ── Bootstrap: ensure code exists + seed mock friends for demo ──

if (typeof globalThis !== "undefined") {
  setTimeout(() => {
    const state = useReferralStore.getState();
    if (!state.referralCode) {
      useReferralStore.getState().generateCode();
    }
  }, 0);
}
