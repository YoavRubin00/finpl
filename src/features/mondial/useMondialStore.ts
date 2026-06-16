// src/features/mondial/useMondialStore.ts
//
// Tiny persisted store for the featured "מאחורי המונדיאל" carousel: remembers
// whether the user has already opened it, so the "new" red dot on the learn-map
// mail badge clears after the first view. The badge itself keeps showing (the
// carousel stays re-openable) — only the unread indicator is one-shot.
//
// Mirrors the useCompletedModulesStore persistence pattern (zustandStorage +
// registerLocalStore for reset-on-logout).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

interface MondialState {
  /** ISO timestamp of the first time the user opened the carousel, else null. */
  openedAt: string | null;
  markOpened: () => void;
  reset: () => void;
}

export const useMondialStore = create<MondialState>()(
  persist(
    (set, get) => ({
      openedAt: null,
      markOpened: () => {
        if (get().openedAt) return; // first-open only
        set({ openedAt: new Date().toISOString() });
      },
      reset: () => set({ openedAt: null }),
    }),
    {
      name: "mondial-carousel-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ openedAt: state.openedAt }),
    }
  )
);

registerLocalStore("mondial-carousel-store-v1", useMondialStore, "mondial-carousel-store-v1");
