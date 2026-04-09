import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import type { DailyQuest } from "./daily-quest-types";
import { QUEST_TEMPLATES, QUEST_XP_REWARD, QUEST_COIN_REWARD } from "./daily-quest-types";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DailyQuestsState {
  quests: DailyQuest[];
  questDate: string;
  rewardClaimed: boolean;

  refreshQuests: () => void;
  syncCompletions: () => void;
  claimReward: () => void;

  completedCount: () => number;
  allCompleted: () => boolean;
}

export const useDailyQuestsStore = create<DailyQuestsState>()(
  persist(
    (set, get) => ({
      quests: [],
      questDate: "",
      rewardClaimed: false,

      refreshQuests: () => {
        const today = todayStr();
        if (get().questDate === today && get().quests.length > 0) {
          // Same day — just sync completions
          get().syncCompletions();
          return;
        }
        // New day — generate fresh quests
        const quests: DailyQuest[] = QUEST_TEMPLATES.map((t, i) => ({
          ...t,
          id: `${today}-${i}`,
          isCompleted: false,
        }));
        set({ quests, questDate: today, rewardClaimed: false });
      },

      syncCompletions: () => {
        const today = todayStr();
        const { quests, questDate } = get();
        if (questDate !== today || quests.length === 0) return;

        const challengeStore = useDailyChallengesStore.getState();
        const chapterStore = useChapterStore.getState();

        const updated = quests.map((q) => {
          if (q.isCompleted) return q;
          switch (q.type) {
            case "dilemma":
              return { ...q, isCompleted: challengeStore.getDilemmaPlaysToday() > 0 };
            case "module": {
              // Check if any module was completed today by comparing all chapter progress
              const allCompleted = Object.values(chapterStore.progress).flatMap((p) => p.completedModules);
              return { ...q, isCompleted: allCompleted.length > 0 };
            }
            case "swipe":
              return { ...q, isCompleted: challengeStore.getSwipeGamePlaysToday() > 0 };
            default:
              return q;
          }
        });

        // Only update if something changed
        if (updated.some((q, i) => q.isCompleted !== quests[i].isCompleted)) {
          set({ quests: updated });
        }
      },

      claimReward: () => {
        if (get().rewardClaimed || !get().allCompleted()) return;
        useEconomyStore.getState().addXP(QUEST_XP_REWARD, "daily_task");
        useEconomyStore.getState().addCoins(QUEST_COIN_REWARD);
        set({ rewardClaimed: true });
      },

      completedCount: () => get().quests.filter((q) => q.isCompleted).length,
      allCompleted: () => get().quests.length > 0 && get().quests.every((q) => q.isCompleted),
    }),
    {
      name: "daily-quests-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        quests: state.quests,
        questDate: state.questDate,
        rewardClaimed: state.rewardClaimed,
      }),
    }
  )
);
