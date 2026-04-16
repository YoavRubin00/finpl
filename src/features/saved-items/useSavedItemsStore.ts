import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { SavedItem } from "./savedItemTypes";

const MAX_SAVED_ITEMS = 50;

interface SavedItemsState {
  items: SavedItem[];
  addItem: (item: Omit<SavedItem, "savedAt">) => void;
  removeItem: (id: string) => void;
  isSaved: (id: string) => boolean;
  getByType: (type: SavedItem["type"]) => SavedItem[];
}

export const useSavedItemsStore = create<SavedItemsState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) return;

        const newItem: SavedItem = {
          ...item,
          savedAt: new Date().toISOString(),
        };

        set((state) => {
          const updated = [newItem, ...state.items];
          if (updated.length > MAX_SAVED_ITEMS) {
            return { items: updated.slice(0, MAX_SAVED_ITEMS) };
          }
          return { items: updated };
        });
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      isSaved: (id) => get().items.some((i) => i.id === id),

      getByType: (type) => get().items.filter((i) => i.type === type),
    }),
    {
      name: "finplay-saved-items",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
