import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { ClanGoal, ClanChestProgress } from './clanTypes';
import { pickWeekGoals, getCurrentWeekKey } from './clanData';

interface ClanGoalsState {
  weekKey: string;
  goals: ClanGoal[];
  progress: ClanChestProgress;

  // Selectors
  getGoals: () => ClanGoal[];
  getProgress: () => ClanChestProgress;
  isChestReady: () => boolean;
  isChestClaimed: () => boolean;
  getTotalChestPoints: () => number;
  getMaxChestPoints: () => number;
  getGoalProgress: (goalId: string) => number;

  // Actions
  ensureCurrentWeek: () => void;
  incrementGoal: (kind: ClanGoal['kind'], amount?: number) => void;
  claimChest: () => { coins: number; gems: number } | null;
}

const CHEST_THRESHOLD = 100; // points needed to unlock chest

export const useClanGoalsStore = create<ClanGoalsState>()(
  persist(
    (set, get) => {
      const initialWeekKey = getCurrentWeekKey();
      const initialGoals = pickWeekGoals(initialWeekKey);
      const initialProgress: ClanChestProgress = {
        weekKey: initialWeekKey,
        progressByGoalId: {},
        completedGoalIds: [],
        chestPoints: 0,
        claimed: false,
      };

      return {
        weekKey: initialWeekKey,
        goals: initialGoals,
        progress: initialProgress,

        getGoals: () => {
          get().ensureCurrentWeek();
          return get().goals;
        },

        getProgress: () => {
          get().ensureCurrentWeek();
          return get().progress;
        },

        isChestReady: () => {
          get().ensureCurrentWeek();
          const { chestPoints, claimed } = get().progress;
          return !claimed && chestPoints >= CHEST_THRESHOLD;
        },

        isChestClaimed: () => {
          get().ensureCurrentWeek();
          return get().progress.claimed;
        },

        getTotalChestPoints: () => {
          get().ensureCurrentWeek();
          return get().progress.chestPoints;
        },

        getMaxChestPoints: () => CHEST_THRESHOLD,

        getGoalProgress: (goalId) => {
          get().ensureCurrentWeek();
          return get().progress.progressByGoalId[goalId] ?? 0;
        },

        ensureCurrentWeek: () => {
          const currentKey = getCurrentWeekKey();
          if (get().weekKey === currentKey) return;
          const newGoals = pickWeekGoals(currentKey);
          const newProgress: ClanChestProgress = {
            weekKey: currentKey,
            progressByGoalId: {},
            completedGoalIds: [],
            chestPoints: 0,
            claimed: false,
          };
          set({ weekKey: currentKey, goals: newGoals, progress: newProgress });

          try {
            const chatStore = require('./useClanChatStore').useClanChatStore;
            chatStore.getState().addSystemMessage({
              kind: 'system',
              event: 'weekly_reset',
              body: 'שבוע חדש — יעדים חדשים! 🔄',
            });
          } catch { /* chat store may not be ready */ }
        },

        incrementGoal: (kind, amount = 1) => {
          get().ensureCurrentWeek();
          const goals = get().goals;
          const goal = goals.find((g) => g.kind === kind);
          if (!goal) return;

          const { progress } = get();
          const current = progress.progressByGoalId[goal.id] ?? 0;
          if (progress.completedGoalIds.includes(goal.id)) return; // already done

          const newValue = current + amount;
          const completed = newValue >= goal.target;

          set((state) => ({
            progress: {
              ...state.progress,
              progressByGoalId: {
                ...state.progress.progressByGoalId,
                [goal.id]: Math.min(newValue, goal.target),
              },
              completedGoalIds: completed
                ? [...state.progress.completedGoalIds, goal.id]
                : state.progress.completedGoalIds,
              chestPoints: completed
                ? Math.min(state.progress.chestPoints + goal.rewardChestPoints, CHEST_THRESHOLD)
                : state.progress.chestPoints,
            },
          }));
        },

        claimChest: () => {
          get().ensureCurrentWeek();
          const state = get();
          if (!state.isChestReady()) return null;

          // Compute total reward from completed goals
          const completedGoals = state.goals.filter((g) =>
            state.progress.completedGoalIds.includes(g.id)
          );
          const totalCoins = completedGoals.reduce((sum, g) => sum + g.rewardCoins, 0);
          const totalGems = completedGoals.reduce((sum, g) => sum + g.rewardGems, 0);

          set((state) => ({
            progress: { ...state.progress, claimed: true },
          }));

          const economyStore = require('../economy/useEconomyStore').useEconomyStore;
          if (totalCoins > 0) economyStore.getState().addCoins(totalCoins);
          if (totalGems > 0) economyStore.getState().addGems(totalGems);

          try {
            const chatStore = require('./useClanChatStore').useClanChatStore;
            chatStore.getState().addSystemMessage({
              kind: 'system',
              event: 'chest_unlocked',
              body: 'האסם נפתח! 🎁',
            });
          } catch { /* chat store may not be ready */ }

          return { coins: totalCoins, gems: totalGems };
        },
      };
    },
    {
      name: 'clan-goals-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        weekKey: state.weekKey,
        goals: state.goals,
        progress: state.progress,
      }),
    }
  )
);
