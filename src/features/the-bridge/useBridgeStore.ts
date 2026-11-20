import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from '../economy/useEconomy';
import { fireEconomyDelta } from '../economy/useEconomyUIStore';
import type { Economy } from '../../lib/api/economy';
import { ApiError } from '../../lib/api/client';
import { redeemBridgeBenefit } from '../../lib/api/bridge';
import { useAuthStore } from '../auth/useAuthStore';
import { BRIDGE_BENEFITS } from './bridgeData';
import { formatShekel } from '../../utils/format';

export type BridgeRedeemResult =
  | {
      ok: true;
      /** The server deducted the coins (false: guest path, local only). */
      serverChecked: boolean;
      /** Redeemed before (another device / a lost answer): nothing deducted now. */
      alreadyRedeemed: boolean;
    }
  | { ok: false; reason: 'not_available' | 'insufficient_coins' | 'failed'; coins: number };

interface BridgeState {
  redeemedBenefitIds: string[];
  /**
   * Signed-in: POST /api/bridge/redeem — the SERVER checks its balance and
   * deducts the cost, once per account and benefit (until 2026-11-20 the app
   * decided from its cached balance and nothing on the server checked it).
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

function hasSession(): boolean {
  const auth = useAuthStore.getState();
  return auth.isAuthenticated && !auth.isGuest;
}

export const useBridgeStore = create<BridgeState>()(
  persist(
    (set, get) => ({
      redeemedBenefitIds: [],

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

        try {
          const res = await redeemBridgeBenefit(benefitId);
          queryClient.setQueryData<Economy | null>(economyQueryKey, res.economy);
          markRedeemed();
          return { ok: true, serverChecked: true, alreadyRedeemed: res.alreadyRedeemed };
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const economy = (err.body as { economy?: Economy } | null)?.economy;
            if (economy) queryClient.setQueryData<Economy | null>(economyQueryKey, economy);
            return { ok: false, reason: 'insufficient_coins', coins: economy?.coins ?? cachedCoins() };
          }
          if (err instanceof ApiError && err.status === 404) {
            return { ok: false, reason: 'not_available', coins: cachedCoins() };
          }
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

      reset: () => set({ redeemedBenefitIds: [] }),
    }),
    {
      name: 'bridge-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        redeemedBenefitIds: state.redeemedBenefitIds,
      }),
    }
  )
);

registerLocalStore('bridge-store', useBridgeStore, 'bridge-store');
