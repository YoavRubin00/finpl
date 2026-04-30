// ---------------------------------------------------------------------------
// Real referral store (replaces the previous mock).
//
// Backed by /api/referral/{register-code, redeem, me, collect}. Keeps the
// previous public surface (referralCode, referredFriends, collectDividend,
// canCollectDividend) so AssetsScreen / ProfileScreen / DuoLearnScreen keep
// working unchanged.
//
// Reward magnitudes (500 + 500 signup, 5% daily) live in `referralConstants.ts`
// and are mirrored server-side in the API endpoints — never hardcode here.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { ReferredFriend } from "./referralTypes";
import { generateReferralCode, getISODateKey } from "./referralData";
import { useEconomyStore } from "../economy/useEconomyStore";
import {
  registerReferralCode,
  fetchReferralState,
  collectReferralDividend,
} from "../../db/sync/syncReferral";

interface ReferralState {
  // ── Legacy public surface (kept for backward compatibility) ──
  referralCode: string;
  referredFriends: ReferredFriend[];
  totalDividendCoins: number;
  totalDividendXP: number;
  hasClaimedDiamondChest: Record<string, boolean>;
  lastDividendDate: string;

  // ── New server-backed state ──
  dividendAvailable: number;            // computed by /api/referral/me
  alreadyCollectedToday: boolean;
  totalYesterdayLearningCoins: number;  // sum across all friends
  isLoading: boolean;
  lastSyncedAt: number;                 // ms epoch of last successful refresh
  isRegisteredOnServer: boolean;        // true once /register-code succeeded

  // ── Actions ──
  generateCode: () => void;
  registerCodeWithServer: (authId: string) => Promise<void>;
  refresh: (authId: string) => Promise<void>;
  collectFromServer: (authId: string) => Promise<{ amount: number; alreadyCollected: boolean } | null>;

  // Legacy actions (still callable; collectDividend now needs an authId
  // to reach the server, so callers without one are no-op).
  canCollectDividend: () => boolean;
  collectDividend: (authId?: string) => void;
  claimDiamondChest: (friendId: string) => void;
}

/** Map a server-returned friend row into the legacy ReferredFriend shape. */
function mapServerFriend(row: {
  authId: string;
  displayName: string | null;
  linkedAt: string;
  yesterdayLearningCoins: number;
}): ReferredFriend {
  return {
    id: row.authId,
    displayName: row.displayName ?? 'חבר',
    avatarEmoji: '🦈',
    joinedAt: Date.parse(row.linkedAt) || Date.now(),
    hasCompletedOnboarding: true,
    yesterdayXP: 0,
    yesterdayGold: row.yesterdayLearningCoins,
    currentModuleId: undefined,
  };
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      // Legacy fields
      referralCode: "",
      referredFriends: [],
      totalDividendCoins: 0,
      totalDividendXP: 0,
      hasClaimedDiamondChest: {},
      lastDividendDate: "",

      // New server-backed fields
      dividendAvailable: 0,
      alreadyCollectedToday: false,
      totalYesterdayLearningCoins: 0,
      isLoading: false,
      lastSyncedAt: 0,
      isRegisteredOnServer: false,

      generateCode: () => {
        const state = get();
        if (state.referralCode) return;
        set({ referralCode: generateReferralCode() });
      },

      registerCodeWithServer: async (authId) => {
        const state = get();
        if (!authId) return;
        // Make sure we have a code first.
        if (!state.referralCode) {
          set({ referralCode: generateReferralCode() });
        }
        const code = get().referralCode;
        // Try up to 3 times with regeneration on collision.
        for (let attempt = 0; attempt < 3; attempt++) {
          const ok = await registerReferralCode(authId, get().referralCode);
          if (ok) {
            set({ isRegisteredOnServer: true });
            return;
          }
          // Collision — regenerate and retry.
          set({ referralCode: generateReferralCode() });
        }
        // Network down or persistent failure — silently keep the local code.
        // Next refresh will retry registration.
      },

      refresh: async (authId) => {
        if (!authId) return;
        set({ isLoading: true });
        try {
          const snapshot = await fetchReferralState(authId);
          if (!snapshot) {
            set({ isLoading: false });
            return;
          }
          const friends = snapshot.friends.map(mapServerFriend);
          set({
            referredFriends: friends,
            dividendAvailable: snapshot.dividendAvailable,
            alreadyCollectedToday: snapshot.alreadyCollectedToday,
            totalYesterdayLearningCoins: snapshot.totalYesterdayLearningCoins,
            lastSyncedAt: Date.now(),
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      collectFromServer: async (authId) => {
        if (!authId) return null;
        const result = await collectReferralDividend(authId);
        if (!result) return null;
        if (result.amount > 0) {
          // Reflect locally for instant UX. Server is source of truth, but the
          // economy store is updated here so the user sees the coin counter
          // tick up immediately.
          try {
            useEconomyStore.getState().addCoins(result.amount);
          } catch { /* non-fatal */ }
          set((s) => ({
            totalDividendCoins: s.totalDividendCoins + result.amount,
            dividendAvailable: 0,
            alreadyCollectedToday: true,
            lastDividendDate: getISODateKey(),
          }));
        } else {
          set({ dividendAvailable: 0, alreadyCollectedToday: true });
        }
        return result;
      },

      canCollectDividend: () => {
        const state = get();
        return !state.alreadyCollectedToday && state.dividendAvailable > 0;
      },

      collectDividend: (authId?: string) => {
        // Legacy entry-point — fire-and-forget call to the server flow when
        // an authId is available. UIs that don't pass authId silently no-op
        // (the new ReferralScreen always passes it).
        if (!authId) return;
        get().collectFromServer(authId).catch(() => { /* non-fatal */ });
      },

      claimDiamondChest: (_friendId: string) => {
        // Legacy mock action. Kept as a no-op so old UI references compile.
        // Diamond Chests aren't part of the real reward model — users get
        // 500 + 500 + 5% (see referralConstants).
      },
    }),
    {
      name: "referral-store-v2",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        referralCode: state.referralCode,
        referredFriends: state.referredFriends,
        totalDividendCoins: state.totalDividendCoins,
        totalDividendXP: state.totalDividendXP,
        hasClaimedDiamondChest: state.hasClaimedDiamondChest,
        lastDividendDate: state.lastDividendDate,
        dividendAvailable: state.dividendAvailable,
        alreadyCollectedToday: state.alreadyCollectedToday,
        totalYesterdayLearningCoins: state.totalYesterdayLearningCoins,
        lastSyncedAt: state.lastSyncedAt,
        isRegisteredOnServer: state.isRegisteredOnServer,
      }),
    }
  )
);

// Bootstrap: ensure code exists. Server registration happens on first
// authenticated render via ReferralScreen / nudge — not here, because the
// auth email isn't known yet at module load.
if (typeof globalThis !== "undefined") {
  setTimeout(() => {
    const state = useReferralStore.getState();
    if (!state.referralCode) {
      useReferralStore.getState().generateCode();
    }
  }, 0);
}
