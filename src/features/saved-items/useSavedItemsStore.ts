import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import type { SavedItem, AddSavedResult } from "./savedItemTypes";
import { MAX_SAVED_ITEMS } from "./savedItemTypes";

interface SavedItemsState {
  items: SavedItem[];
  addItem: (item: Omit<SavedItem, "savedAt">) => AddSavedResult;
  removeItem: (id: string) => void;
  isSaved: (id: string) => boolean;
  getByType: (type: SavedItem["type"]) => SavedItem[];
  reset: () => void;
}

export const useSavedItemsStore = create<SavedItemsState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;
        if (items.find((i) => i.id === item.id)) return { ok: false, reason: "duplicate" };
        if (items.length >= MAX_SAVED_ITEMS) return { ok: false, reason: "cap" };

        const newItem: SavedItem = {
          ...item,
          savedAt: new Date().toISOString(),
        };

        set({ items: [newItem, ...items] });
        return { ok: true };
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      isSaved: (id) => get().items.some((i) => i.id === id),

      getByType: (type) => get().items.filter((i) => i.type === type),
      reset: () => set({ items: [] }),
    }),
    {
      name: "finplay-saved-items",
      storage: createJSONStorage(() => zustandStorage),
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2 && persisted && typeof persisted === "object") {
          return persisted;
        }
        return persisted as SavedItemsState;
      },
    },
  ),
);

registerLocalStore('finplay-saved-items', useSavedItemsStore, 'finplay-saved-items');