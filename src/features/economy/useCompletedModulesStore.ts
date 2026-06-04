// src/features/economy/useCompletedModulesStore.ts
//
// Durable, locally-persisted record of completed module IDs.
//
// Why this exists: the server-backed progress lives in the react-query cache
// (key ['progress']) which is in-memory only — empty on cold start until
// GET /api/sync/progress resolves, and overwritten by the refetch fired after
// every completion (onSettled → invalidateQueries). When that refetch returns
// data missing the just-completed module (server lag, guest with no server row,
// auth hiccup), the optimistic completion is wiped and the NEXT module's unlock
// gate re-locks it. Persisting completions locally and unioning them into the
// completion readers (see useProgress.ts) guarantees a known completion never
// regresses, so the next module unlocks immediately and stays unlocked.
//
// Mirrors the useEconomyUIStore persistence pattern (MMKV via zustandStorage +
// registerLocalStore for reset-on-logout).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

interface CompletedModulesState {
  completedIds: string[];
  /**
   * 2026-06-04: one-shot flag that gates the mod-0-1 split backfill.
   *
   * mod-0-1 ("מושגי יסוד פיננסיים") was split into mod-0-1 (short — bank /
   * account / interest) + mod-0-1b (continuation — loan / credit / pension).
   * Existing users who completed the PRE-split long mod-0-1 already saw all
   * of that content, so we auto-mark mod-0-1b for them on the next launch.
   *
   * The flag is critical: without it, the same backfill would also fire for
   * NEW users who legitimately finished the post-split short mod-0-1 — it
   * would skip mod-0-1b for them and they'd never see the loan + pension
   * cards. With the flag, the migration runs exactly ONCE per device, on
   * the first rehydration after this code ships.
   *
   * Edge case NOT covered: a user who completed the long mod-0-1 on
   * device A, then installs the new app fresh on device B. Their device-B
   * local store starts empty, so the migration sees no mod-0-1 and writes
   * nothing. Their server progress will still surface mod-0-1 as completed
   * (via the React Query cache in useProgress), but mod-0-1b will look
   * "untouched" on the chapter map. Fix would be a server-side backfill
   * keyed on completion timestamp < deploy date. Punted for now — most
   * users are single-device.
   */
  splitV1MigrationApplied: boolean;
  markCompleted: (id: string) => void;
  markManyCompleted: (ids: string[]) => void;
  reset: () => void;
}

export const useCompletedModulesStore = create<CompletedModulesState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      splitV1MigrationApplied: false,

      markCompleted: (id: string) => {
        if (!id) return;
        if (get().completedIds.includes(id)) return; // no-op if already present
        set({ completedIds: [...get().completedIds, id] });
      },

      markManyCompleted: (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        const current = get().completedIds;
        const merged = [...new Set([...current, ...ids.filter(Boolean)])];
        // Only commit if something actually changed (avoid needless re-renders).
        if (merged.length !== current.length) set({ completedIds: merged });
      },

      // Logout resets local progress AND the migration flag, so a new user
      // signing in on the same device gets a fresh evaluation on next launch.
      reset: () => set({ completedIds: [], splitV1MigrationApplied: false }),
    }),
    {
      name: "completed-modules-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        completedIds: state.completedIds,
        splitV1MigrationApplied: state.splitV1MigrationApplied,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.completedIds)) state.completedIds = [];
        // One-shot mod-0-1 split backfill — see splitV1MigrationApplied
        // docstring. Mutating state directly here is the canonical Zustand
        // persist pattern; the next persist write captures the result.
        if (!state.splitV1MigrationApplied) {
          if (
            state.completedIds.includes('mod-0-1') &&
            !state.completedIds.includes('mod-0-1b')
          ) {
            state.completedIds = [...state.completedIds, 'mod-0-1b'];
          }
          state.splitV1MigrationApplied = true;
        }
      },
    }
  )
);

registerLocalStore('completed-modules-store-v1', useCompletedModulesStore, 'completed-modules-store-v1');
