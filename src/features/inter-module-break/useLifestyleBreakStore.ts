import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";

const RECENT_HISTORY = 4;

interface LifestyleBreakState {
  seenIds: string[];
  markSeen: (id: string) => void;
  reset: () => void;
}

export const useLifestyleBreakStore = create<LifestyleBreakState>()(
  persist(
    (set) => ({
      seenIds: [],
      markSeen: (id: string) => {
        set((state) => {
          const next = [id, ...state.seenIds.filter((x) => x !== id)].slice(0, RECENT_HISTORY);
          return { seenIds: next };
        });
      },
      reset: () => set({ seenIds: [] }),
    }),
    {
      name: "lifestyle-break-store",
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
