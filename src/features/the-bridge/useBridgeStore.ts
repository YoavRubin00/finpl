import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey, withPendingGems } from '../economy/useEconomy';
import { fireEconomyDelta } from '../economy/useEconomyUIStore';
import type { Economy } from '../../lib/api/economy';
import { redeemBridgeBenefit } from '../../lib/api/bridge';
import { useAuthStore } from '../auth/useAuthStore';
import { BRIDGE_BENEFITS } from './bridgeData';
import { formatShekel } from '../../utils/format';
import { isRedeemAnswer, nextPendingRedeemIds, runRedeemAttempts } from './bridgeRedeemCore';

export type BridgeRedeemResult =
  | {
      ok: true;
      /** The server deducted the coins (false: guest path, local only). */
      serverChecked: boolean;
      /** Redeemed before (another device / a lost answer): nothing deducted now. */
      alreadyRedeemed: boolean;
    }
  | {
      ok: false;
      /**
       * 'failed': no answer that says what happened, even after one retry (the
       * benefit is then kept in pendingRedeemIds), or another refusal.
       * 'signed_out': the session is missing or was rejected (401).
       */
      reason: 'not_available' | 'insufficient_coins' | 'failed' | 'signed_out';
      coins: number;
    };

interface BridgeState {
  redeemedBenefitIds: string[];
  /**
   * Benefits whose last redemption got no answer that says what happened (no
   * network, a body that is not JSON, a 5xx), even after one retry: the server
   * may have deducted the coins. The Bridge lets the next tap on them reach the
   * server whatever the balance on screen; the server then answers
   * alreadyRedeemed, deducts now, or says there are not enough coins. Cleared
   * by such an answer. Persisted (a relaunch must not lose it).
   */
  pendingRedeemIds: string[];
  /**
   * Signed-in: POST /api/bridge/redeem — the SERVER checks its balance and
   * deducts the cost, once per account and benefit (until 2026-11-20 the app
   * decided from its cached balance and nothing on the server checked it).
   * An unknown outcome is sent once more (safe: the server answers
   * alreadyRedeemed when the first request landed).
   * Guest (no session, coins exist only on this device): the old local path.
   */
  redeemBenefit: (benefitId: string) => Promise<BridgeRedeemResult>;
  isBenefitRedeemed: (benefitId: string) => boolean;
  getRedeemedCount: () => number;
  getTotalSavedValue: () => string;
  reset: () => void;
}

function cachedCoins(): number {
  return queryClient.getQueryData<Economy | null>(economyQueryKey)?.coins ?? 0;
}

function isEconomyRow(v: unknown): v is Economy {
  return !!v && typeof v === 'object' && typeof (v as { virtualBalance?: unknown }).virtualBalance === 'string';
}

function hasSession(): boolean {
  const auth = useAuthStore.getState();
  return auth.isAuthenticated && !auth.isGuest;
}

export const useBridgeStore = create<BridgeState>()(
  persist(
    (set, get) => ({
      redeemedBenefitIds: [],
      pendingRedeemIds: [],

      redeemBenefit: async (benefitId: string): Promise<BridgeRedeemResult> => {
        const benefit = BRIDGE_BENEFITS.find((b) => b.id === benefitId);
        if (!benefit || !benefit.isAvailable) return { ok: false, reason: 'not_available', coins: cachedCoins() };

        const markRedeemed = () =>
          set((state) => ({
            redeemedBenefitIds: state.redeemedBenefitIds.includes(benefitId)
              ? state.redeemedBenefitIds
              : [...state.redeemedBenefitIds, benefitId],
          }));

        if (!hasSession()) {
          // Guest: no server balance to check. Same as before.
          if (get().redeemedBenefitIds.includes(benefitId)) {
            return { ok: true, serverChecked: false, alreadyRedeemed: true };
          }
          if (cachedCoins() < benefit.costCoins) {
            return { ok: false, reason: 'insufficient_coins', coins: cachedCoins() };
          }
          fireEconomyDelta({ coinsDelta: -benefit.costCoins });
          markRedeemed();
          return { ok: true, serverChecked: false, alreadyRedeemed: false };
        }

        // One retry when the outcome is unknown (bridgeRedeemCore.ts).
        const { outcome } = await runRedeemAttempts(() => redeemBridgeBenefit(benefitId), isRedeemAnswer);
        set((state) => ({ pendingRedeemIds: nextPendingRedeemIds(state.pendingRedeemIds, benefitId, outcome.kind) }));
        switch (outcome.kind) {
          case 'redeemed': {
            const economy = outcome.answer.economy;
            if (isEconomyRow(economy)) queryClient.setQueryData<Economy | null>(economyQueryKey, withPendingGems(economy));
            markRedeemed();
            return { ok: true, serverChecked: true, alreadyRedeemed: outcome.answer.alreadyRedeemed === true };
          }
          case 'insufficient': {
            const economy = (outcome.body as { economy?: unknown } | null)?.economy;
            if (isEconomyRow(economy)) {
              queryClient.setQueryData<Economy | null>(economyQueryKey, withPendingGems(economy));
              return { ok: false, reason: 'insufficient_coins', coins: economy.coins ?? 0 };
            }
            return { ok: false, reason: 'insufficient_coins', coins: cachedCoins() };
          }
          case 'not_available':
            return { ok: false, reason: 'not_available', coins: cachedCoins() };
          case 'signed_out':
            return { ok: false, reason: 'signed_out', coins: cachedCoins() };
          default:
            return { ok: false, reason: 'failed', coins: cachedCoins() };
        }
      },

      isBenefitRedeemed: (benefitId: string): boolean => {
        return get().redeemedBenefitIds.includes(benefitId);
      },

      getRedeemedCount: (): number => {
        return get().redeemedBenefitIds.length;
      },

      getTotalSavedValue: (): string => {
        const count = get().redeemedBenefitIds.length;
        // Mock estimate, real value would come from partners
        return formatShekel(count * 75);
      },

      reset: () => set({ redeemedBenefitIds: [], pendingRedeemIds: [] }),
    }),
    {
      name: 'bridge-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        redeemedBenefitIds: state.redeemedBenefitIds,
        pendingRedeemIds: state.pendingRedeemIds,
      }),
      // Saved by a build before pendingRedeemIds existed (or damaged): start empty.
      onRehydrateStorage: () => (state) => {
        if (state && !Array.isArray(state.pendingRedeemIds)) state.pendingRedeemIds = [];
      },
    }
  )
);

registerLocalStore('bridge-store', useBridgeStore, 'bridge-store');
