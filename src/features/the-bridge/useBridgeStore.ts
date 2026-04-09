import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEconomyStore } from '../economy/useEconomyStore';
import { BRIDGE_BENEFITS } from './bridgeData';

interface BridgeState {
  redeemedBenefitIds: string[];
  redeemBenefit: (benefitId: string) => boolean;
  isBenefitRedeemed: (benefitId: string) => boolean;
  getRedeemedCount: () => number;
  getTotalSavedValue: () => string;
}

export const useBridgeStore = create<BridgeState>()(
  persist(
    (set, get) => ({
      redeemedBenefitIds: [],

      redeemBenefit: (benefitId: string): boolean => {
        const benefit = BRIDGE_BENEFITS.find((b) => b.id === benefitId);
        if (!benefit || !benefit.isAvailable) return false;

        // Already redeemed
        if (get().redeemedBenefitIds.includes(benefitId)) return false;

        // Attempt to spend coins
        const success = useEconomyStore.getState().spendCoins(benefit.costCoins);
        if (!success) return false;

        set((state) => ({
          redeemedBenefitIds: [...state.redeemedBenefitIds, benefitId],
        }));

        return true;
      },

      isBenefitRedeemed: (benefitId: string): boolean => {
        return get().redeemedBenefitIds.includes(benefitId);
      },

      getRedeemedCount: (): number => {
        return get().redeemedBenefitIds.length;
      },

      getTotalSavedValue: (): string => {
        const count = get().redeemedBenefitIds.length;
        // Mock estimate — real value would come from partners
        return `₪${(count * 75).toLocaleString()}`;
      },
    }),
    {
      name: 'bridge-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        redeemedBenefitIds: state.redeemedBenefitIds,
      }),
    }
  )
);
