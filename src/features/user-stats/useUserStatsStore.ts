import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";

interface UserStatsState {
  moduleDurations: number[];
  dailySessionSeconds: Record<string, number>;

  recordModuleDuration: (seconds: number) => void;
  addSessionSeconds: (seconds: number) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

export const useUserStatsStore = create<UserStatsState>()(
  persist(
    (set) => ({
      moduleDurations: [],
      dailySessionSeconds: {},

      recordModuleDuration: (seconds: number) => {
        if (seconds < 5 || seconds > 7200) return;
        set((s) => ({
          moduleDurations: [...s.moduleDurations, seconds].slice(-200),
        }));
      },

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
    }),
    {
      name: "user-stats-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        moduleDurations: s.moduleDurations,
        dailySessionSeconds: s.dailySessionSeconds,
      }),
    }
  )
);
