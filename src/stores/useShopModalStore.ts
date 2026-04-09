import { create } from "zustand";

interface ShopModalState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useShopModalStore = create<ShopModalState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
