import { create } from "zustand";
import type { GatedFeature } from "../features/subscription/useSubscriptionStore";

interface UpgradeModalState {
  visible: boolean;
  feature: GatedFeature | null;
  show: (feature: GatedFeature) => void;
  hide: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  visible: false,
  feature: null,
  show: (feature) => set({ visible: true, feature }),
  hide: () => set({ visible: false }),
}));
