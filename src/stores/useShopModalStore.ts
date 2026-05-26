import { create } from "zustand";
import { registerLocalStore } from '../lib/stores/registry';

interface ShopModalState {
  visible: boolean;
  open: () => void;
  close: () => void;
  reset: () => void;
}

export const useShopModalStore = create<ShopModalState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
  reset: () => set({ visible: false }),
}));

registerLocalStore('shop-modal-store', useShopModalStore, null);
