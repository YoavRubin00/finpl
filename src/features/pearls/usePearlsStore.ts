/**
 * Tracks which Pearls the user has OPENED (entered + finished) plus the
 * last-reached stage for mid-flow resumption. MMKV-persisted via
 * zustandStorage so completed-pearl checkmarks AND in-progress positions
 * survive cold starts.
 *
 * "Opened" / "completed" are intentionally one concept here — entering a
 * Pearl is opt-in and short, so once the user finishes the sheet we just
 * mark it done. There is no separate "started but didn't finish" state at
 * the pearl-completion level — but `lastStageByPearl` does track WHERE the
 * user was so re-opening resumes instead of restarting.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { markDailyActivityCompleted } from '../economy/useStreak';

interface PearlsState {
  /** Pearl ids (from pearlIdFor()) that the user has completed at least once. */
  completedIds: string[];
  /** Per-pearl last-reached stage kind, for mid-flow resumption.
   *  Stored as a string kind (e.g. 'concept', 'video', 'scenario') rather
   *  than an index so a stages-array change between opens — e.g. the
   *  profile-question being included on first open but not on resume,
   *  because the user answered it — doesn't strand the cursor on a
   *  no-longer-existent stage. PearlSheet finds the index of this kind
   *  in the freshly-built stages array; if not found, starts from 0. */
  lastStageByPearl: Record<string, string>;
  markCompleted: (pearlId: string) => void;
  /** Remembers the stage the user is currently on so we can resume there
   *  if they close the sheet mid-flow. PearlSheet calls this after every
   *  successful goToPage. */
  setLastStage: (pearlId: string, stageKind: string) => void;
  /** Clears the last-stage memory for a pearl. Called automatically by
   *  markCompleted (no point resuming a finished pearl); exposed for
   *  manual reset paths (e.g. dev reset utility). */
  clearLastStage: (pearlId: string) => void;
  reset: () => void;
}

export const usePearlsStore = create<PearlsState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      lastStageByPearl: {},
      markCompleted: (pearlId) => {
        const alreadyDone = get().completedIds.includes(pearlId);
        // Always clear last-stage memory on completion, even if the pearl
        // was already in completedIds — keeps the store tidy and means a
        // future "redo this pearl" feature would start clean.
        set((state) => {
          const next = { ...state.lastStageByPearl };
          delete next[pearlId];
          return {
            completedIds: alreadyDone ? state.completedIds : [...state.completedIds, pearlId],
            lastStageByPearl: next,
          };
        });
        if (!alreadyDone) {
          // Pearls count toward the unified daily streak. Helper is idempotent
          // per day, so completing multiple pearls in one day still advances
          // the streak only once — same rule as lesson/quest/DNC/tool.
          markDailyActivityCompleted();
        }
      },
      setLastStage: (pearlId, stageKind) => {
        if (get().completedIds.includes(pearlId)) return; // completed pearls don't track progress
        set((state) => ({
          lastStageByPearl: { ...state.lastStageByPearl, [pearlId]: stageKind },
        }));
      },
      clearLastStage: (pearlId) => {
        set((state) => {
          const next = { ...state.lastStageByPearl };
          delete next[pearlId];
          return { lastStageByPearl: next };
        });
      },
      reset: () => set({ completedIds: [], lastStageByPearl: {} }),
    }),
    {
      // Version bumped v1 → v2 when lastStageByPearl was added. Old persisted
      // state from v1 won't have the field — zustand's persist middleware
      // merges the missing key with the initial state (empty object), so
      // existing users are not bricked, just start without any saved progress.
      name: 'pearls-store-v2',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

/** Convenience selector — true if the given Pearl has been completed. */
export function useIsPearlCompleted(pearlId: string): boolean {
  return usePearlsStore((s) => s.completedIds.includes(pearlId));
}
