import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { registerLocalStore } from "../../lib/stores/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface UserStatsUIState {
  /** Per-day session seconds map. Keys are ISO date strings (YYYY-MM-DD). */
  dailySessionSeconds: Record<string, number>;

  addSessionSeconds: (seconds: number) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  dailySessionSeconds: {} as Record<string, number>,
};

export const useUserStatsUIStore = create<UserStatsUIState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      addSessionSeconds: (seconds: number) => {
        if (seconds <= 0) return;
        const today = todayISO();
        const cutoff = cutoffISO();
        set((s) => {
          const current = s.dailySessionSeconds[today] ?? 0;
          const updated = Math.min(current + seconds, 43200);
          const all = { ...s.dailySessionSeconds, [today]: updated };
          const trimmed = Object.fromEntries(
            Object.entries(all).filter(([k]) => k >= cutoff)
          );
          return { dailySessionSeconds: trimmed };
        });
      },

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: "user-stats-ui-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        dailySessionSeconds: s.dailySessionSeconds,
      }),
    }
  )
);

registerLocalStore("user-stats-ui-store-v1", useUserStatsUIStore, "user-stats-ui-store-v1");
