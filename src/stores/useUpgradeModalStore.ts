import { create } from "zustand";
import type { GatedFeature } from "../features/subscription/subscriptionConstants";
import { useMonetizationIntentStore } from "../features/monetization/useMonetizationIntentStore";
import { registerLocalStore } from '../lib/stores/registry';

interface UpgradeModalState {
  visible: boolean;
  feature: GatedFeature | null;
  show: (feature: GatedFeature) => void;
  hide: () => void;
  reset: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  visible: false,
  feature: null,
  show: (feature) => {
    useMonetizationIntentStore.getState().trackProTap(feature);
    set({ visible: true, feature });
  },
  hide: () => set({ visible: false }),
  reset: () => set({ visible: false, feature: null }),
}));

registerLocalStore('upgrade-modal-store', useUpgradeModalStore, null);
