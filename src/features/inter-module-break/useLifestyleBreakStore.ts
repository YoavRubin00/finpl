import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from '../../lib/stores/registry';

const RECENT_HISTORY = 4;

interface LifestyleBreakState {
  /** Rolling short-term history (most recent 4) — used to avoid back-to-back
   *  repeats of regular rotation videos. */
  seenIds: string[];
  /** Permanent record of oneShot videos the user has already watched. Never
   *  truncated — these clips should appear at most once per user. */
  oneShotSeenIds: string[];
  /** Mark a video as seen. Pass `oneShot` to also record it in the permanent
   *  list so the picker will skip it forever. */
  markSeen: (id: string, oneShot?: boolean) => void;
  reset: () => void;
}

export const useLifestyleBreakStore = create<LifestyleBreakState>()(
  persist(
    (set) => ({
      seenIds: [],
      oneShotSeenIds: [],
      markSeen: (id: string, oneShot?: boolean) => {
        set((state) => {
          const seenIds = [id, ...state.seenIds.filter((x) => x !== id)].slice(0, RECENT_HISTORY);
          const oneShotSeenIds = oneShot && !state.oneShotSeenIds.includes(id)
            ? [...state.oneShotSeenIds, id]
            : state.oneShotSeenIds;
          return { seenIds, oneShotSeenIds };
        });
      },
      reset: () => set({ seenIds: [], oneShotSeenIds: [] }),
    }),
    {
      name: "lifestyle-break-store",
      // v2: added oneShotSeenIds. v1 persisted state has no field for it;
      // zustand persist will default it to [] on first read after upgrade.
      version: 2,
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

registerLocalStore('lifestyle-break-store', useLifestyleBreakStore, 'lifestyle-break-store');
