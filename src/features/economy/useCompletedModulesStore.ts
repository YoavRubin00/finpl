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
  markCompleted: (id: string) => void;
  markManyCompleted: (ids: string[]) => void;
  reset: () => void;
}

export const useCompletedModulesStore = create<CompletedModulesState>()(
  persist(
    (set, get) => ({
      completedIds: [],

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

      reset: () => set({ completedIds: [] }),
    }),
    {
      name: "completed-modules-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ completedIds: state.completedIds }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.completedIds)) state.completedIds = [];
      },
    }
  )
);

registerLocalStore('completed-modules-store-v1', useCompletedModulesStore, 'completed-modules-store-v1');
