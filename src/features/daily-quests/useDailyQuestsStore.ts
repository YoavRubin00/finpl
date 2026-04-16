import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from "../economy/useEconomyStore";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import type { DailyQuest, QuestRewardSummary } from "./daily-quest-types";
import {
  QUEST_TEMPLATES,
  QUEST_XP_REWARD,
  QUEST_COIN_REWARD,
  QUEST_GEM_CHANCE,
  QUEST_GEM_AMOUNT,
  QUEST_STREAK_BONUS_STEP,
  QUEST_STREAK_BONUS_PCT,
  QUEST_FREEZE_BONUS_MODULO,
} from "./daily-quest-types";

function streakBonusMultiplier(streak: number): number {
  const steps = Math.floor(streak / QUEST_STREAK_BONUS_STEP);
  return 1 + steps * QUEST_STREAK_BONUS_PCT;
}

function streakBonusPct(streak: number): number {
  return Math.floor(streak / QUEST_STREAK_BONUS_STEP) * Math.round(QUEST_STREAK_BONUS_PCT * 100);
}

/** Deterministic preview (max-potential shape) so UI can render a consistent "what's inside" before claim */
export function previewQuestReward(streak: number): QuestRewardSummary {
  const mult = streakBonusMultiplier(streak);
  return {
    xp: Math.round(QUEST_XP_REWARD * mult),
    coins: Math.round(QUEST_COIN_REWARD * mult),
    gems: QUEST_GEM_AMOUNT,
    freezes: 0,
    streakBonusPct: streakBonusPct(streak),
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DailyQuestsState {
  quests: DailyQuest[];
  questDate: string;
  rewardClaimed: boolean;
  lastRewardSummary: QuestRewardSummary | null;

  refreshQuests: () => void;
  syncCompletions: () => void;
  claimReward: () => QuestRewardSummary | null;

  completedCount: () => number;
  allCompleted: () => boolean;
}

export const useDailyQuestsStore = create<DailyQuestsState>()(
  persist(
    (set, get) => ({
      quests: [],
      questDate: "",
      rewardClaimed: false,
      lastRewardSummary: null,

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
        set({ quests, questDate: today, rewardClaimed: false, lastRewardSummary: null });
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
        // Atomic synchronous guard against double-click race: flip rewardClaimed
        // inside set() before external calls so any re-entrant claim is ignored.
        let alreadyClaimed = false;
        set((state) => {
          if (state.rewardClaimed) {
            alreadyClaimed = true;
            return state;
          }
          const allDone = state.quests.length > 0 && state.quests.every((q) => q.isCompleted);
          if (!allDone) {
            alreadyClaimed = true;
            return state;
          }
          return { ...state, rewardClaimed: true };
        });
        if (alreadyClaimed) return null;

        const economy = useEconomyStore.getState();
        const streak = economy.streak;
        const mult = streakBonusMultiplier(streak);

        const xp = Math.round(QUEST_XP_REWARD * mult);
        const coins = Math.round(QUEST_COIN_REWARD * mult);
        const gems = Math.random() < QUEST_GEM_CHANCE ? QUEST_GEM_AMOUNT : 0;
        // NOTE: streak freeze on day-7 is already granted by useEconomyStore milestone
        // logic — no duplicate grant here, only surfaced in summary for UI celebration.
        const freezes = 0;

        economy.addXP(xp, "daily_task");
        economy.addCoins(coins);
        if (gems > 0) economy.addGems(gems);

        const summary: QuestRewardSummary = {
          xp,
          coins,
          gems,
          freezes,
          streakBonusPct: streakBonusPct(streak),
        };
        set({ lastRewardSummary: summary });
        return summary;
      },

      completedCount: () => get().quests.filter((q) => q.isCompleted).length,
      allCompleted: () => get().quests.length > 0 && get().quests.every((q) => q.isCompleted),
    }),
    {
      name: "daily-quests-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        quests: state.quests,
        questDate: state.questDate,
        rewardClaimed: state.rewardClaimed,
        lastRewardSummary: state.lastRewardSummary,
      }),
    }
  )
);
