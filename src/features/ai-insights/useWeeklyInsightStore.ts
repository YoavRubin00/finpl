import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';

export interface FreeInsight {
  emoji: string;
  title: string;
  body: string;
}

interface WeeklyInsightState {
  lastFetchedAt: string | null; // ISO date YYYY-MM-DD
  cachedInsight: FreeInsight | null;

  shouldRefetch: () => boolean;
  saveInsight: (insight: FreeInsight) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useWeeklyInsightStore = create<WeeklyInsightState>()(
  persist(
    (set, get) => ({
      lastFetchedAt: null,
      cachedInsight: null,

      shouldRefetch: (): boolean => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        const daysSince = Math.floor(
          (Date.now() - new Date(lastFetchedAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSince >= 7;
      },

      saveInsight: (insight: FreeInsight) => {
        set({ cachedInsight: insight, lastFetchedAt: todayISO() });
      },
    }),
    {
      name: "weekly-insight-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        lastFetchedAt: state.lastFetchedAt,
        cachedInsight: state.cachedInsight,
      }),
    },
  ),
);