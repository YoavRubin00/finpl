import { create } from "zustand";
import type { GatedFeature } from "../features/subscription/useSubscriptionStore";
import { useMonetizationIntentStore } from "../features/monetization/useMonetizationIntentStore";

interface UpgradeModalState {
  visible: boolean;
  feature: GatedFeature | null;
  show: (feature: GatedFeature) => void;
  hide: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  visible: false,
  feature: null,
  show: (feature) => {
    useMonetizationIntentStore.getState().trackProTap(feature);
    set({ visible: true, feature });
  },
  hide: () => set({ visible: false }),
}));
