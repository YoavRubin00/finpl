import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScenarioGrade, ScenarioLabState } from './scenarioLabTypes';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useScenarioLabStore = create<ScenarioLabState>()(
  persist(
    (set, get) => ({
      completedScenarios: {},
      lastPlayedDate: null,
      totalScenariosPlayed: 0,
      userSuggestions: [],

      canPlayToday: (): boolean => {
        const isPro = useSubscriptionStore.getState().tier === 'pro';
        if (isPro) return true;
        const { lastPlayedDate } = get();
        return lastPlayedDate !== todayISO();
      },

      recordCompletion: (
        scenarioId: string,
        grade: ScenarioGrade,
        score: number,
      ): void => {
        const { completedScenarios } = get();
        const existing = completedScenarios[scenarioId];
        const best = existing
          ? Math.max(existing.bestScore, score)
          : score;
        const bestGrade = existing
          ? (score >= existing.bestScore ? grade : existing.grade)
          : grade;

        set({
          completedScenarios: {
            ...completedScenarios,
            [scenarioId]: { grade: bestGrade, bestScore: best, completedAt: Date.now() },
          },
          lastPlayedDate: todayISO(),
          totalScenariosPlayed: get().totalScenariosPlayed + 1,
        });
      },

      getBestGrade: (scenarioId: string): ScenarioGrade | null => {
        const entry = get().completedScenarios[scenarioId];
        return entry?.grade ?? null;
      },

      submitSuggestion: (title: string, description: string): void => {
        const suggestion = {
          id: `sug-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          submittedAt: Date.now(),
        };
        set({ userSuggestions: [...get().userSuggestions, suggestion] });
      },
    }),
    {
      name: 'scenario-lab-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        completedScenarios: state.completedScenarios,
        lastPlayedDate: state.lastPlayedDate,
        totalScenariosPlayed: state.totalScenariosPlayed,
        userSuggestions: state.userSuggestions,
      }),
    },
  ),
);
