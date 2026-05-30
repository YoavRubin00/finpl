/**
 * Tracks which Pearls the user has OPENED (entered + finished). MMKV-persisted
 * via zustandStorage so completed-pearl checkmarks survive cold starts.
 *
 * "Opened" / "completed" are intentionally one concept here — entering a
 * Pearl is opt-in and short, so once the user finishes the sheet we just
 * mark it done. There is no separate "started but didn't finish" state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

interface PearlsState {
  /** Pearl ids (from pearlIdFor()) that the user has completed at least once. */
  completedIds: string[];
  markCompleted: (pearlId: string) => void;
  reset: () => void;
}

export const usePearlsStore = create<PearlsState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      markCompleted: (pearlId) => {
        if (get().completedIds.includes(pearlId)) return;
        set((state) => ({ completedIds: [...state.completedIds, pearlId] }));
      },
      reset: () => set({ completedIds: [] }),
    }),
    {
      name: 'pearls-store-v1',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

/** Convenience selector — true if the given Pearl has been completed. */
export function useIsPearlCompleted(pearlId: string): boolean {
  return usePearlsStore((s) => s.completedIds.includes(pearlId));
}
