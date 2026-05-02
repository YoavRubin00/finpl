import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from "../economy/useEconomyStore";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import type { DailyQuest, QuestRewardSummary } from "./daily-quest-types";
import {
  QUEST_TEMPLATES,
  questTemplatesByType,
  QUEST_XP_REWARD,
  QUEST_COIN_REWARD,
  QUEST_GEM_CHANCE,
  QUEST_GEM_AMOUNT,
  QUEST_STREAK_BONUS_STEP,
  QUEST_STREAK_BONUS_PCT,
  QUEST_FREEZE_BONUS_MODULO,
  QUEST_PRO_XP_MULTIPLIER,
  QUEST_PRO_COIN_MULTIPLIER,
  QUEST_PRO_GEMS_GUARANTEED,
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

/** PRO track preview, 2× XP/coins + guaranteed gem */
export function previewProQuestReward(streak: number): QuestRewardSummary {
  const mult = streakBonusMultiplier(streak);
  return {
    xp: Math.round(QUEST_XP_REWARD * QUEST_PRO_XP_MULTIPLIER * mult),
    coins: Math.round(QUEST_COIN_REWARD * QUEST_PRO_COIN_MULTIPLIER * mult),
    gems: QUEST_PRO_GEMS_GUARANTEED,
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
  proRewardClaimed: boolean;
  newlyCompleted: boolean;
  lastRewardSummary: QuestRewardSummary | null;

  clearNewlyCompleted: () => void;
  refreshQuests: () => void;
  syncCompletions: () => void;
  claimReward: () => QuestRewardSummary | null;
  claimProReward: () => QuestRewardSummary | null;

  completedCount: () => number;
  allCompleted: () => boolean;
}

export const useDailyQuestsStore = create<DailyQuestsState>()(
  persist(
    (set, get) => ({
      quests: [],
      questDate: "",
      rewardClaimed: false,
      proRewardClaimed: false,
      newlyCompleted: false,
      lastRewardSummary: null,

      clearNewlyCompleted: () => set({ newlyCompleted: false }),

      refreshQuests: () => {
        const today = todayStr();
        if (get().questDate === today && get().quests.length > 0) {
          // Same day, just sync completions
          get().syncCompletions();
          return;
        }
        // New day — pick one random template per type from the pool of 12.
        // Keeps the 3-quest rhythm while rotating copy daily (Brawl Stars pattern).
        const byType = questTemplatesByType();
        const order: DailyQuest["type"][] = ["dilemma", "module", "swipe"];
        const quests: DailyQuest[] = order.map((type, i) => {
          const pool = byType[type];
          const tpl = pool[Math.floor(Math.random() * pool.length)] ?? QUEST_TEMPLATES[i];
          return { ...tpl, id: `${today}-${i}`, isCompleted: false };
        });
        set({ quests, questDate: today, rewardClaimed: false, proRewardClaimed: false, newlyCompleted: false, lastRewardSummary: null });
      },

      syncCompletions: () => {
        const today = todayStr();
        const { quests, questDate } = get();
        if (questDate !== today || quests.length === 0) return;

        const challengeStore = useDailyChallengesStore.getState();
        const chapterStore = useChapterStore.getState();

        const dilemmaPlays = challengeStore.getDilemmaPlaysToday();
        const swipePlays = challengeStore.getSwipeGamePlaysToday();
        const todayCompletedMods = Object.values(chapterStore.progress).flatMap((p) => p.completedModules).length;

        const updated = quests.map((q) => {
          if (q.isCompleted) return q;
          let done = false;
          if (q.type === "dilemma") done = dilemmaPlays > 0;
          else if (q.type === "module") done = todayCompletedMods > 0;
          else if (q.type === "swipe") done = swipePlays > 0;
          return done ? { ...q, isCompleted: true } : q;
        });

        // Only update if something changed
        if (updated.some((q, i) => q.isCompleted !== quests[i].isCompleted)) {
          const allDoneNow = updated.length > 0 && updated.every((q) => q.isCompleted);
          const wasAllDone = get().allCompleted();
          set({
            quests: updated,
            ...(allDoneNow && !wasAllDone ? { newlyCompleted: true } : {})
          });
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
        // logic, no duplicate grant here, only surfaced in summary for UI celebration.
        const freezes = 0;

        economy.addXP(xp, "daily_task");
        economy.addCoins(coins, 'daily-quest');
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

      claimProReward: () => {
        let alreadyClaimed = false;
        set((state) => {
          if (state.proRewardClaimed) { alreadyClaimed = true; return state; }
          const allDone = state.quests.length > 0 && state.quests.every((q) => q.isCompleted);
          if (!allDone) { alreadyClaimed = true; return state; }
          return { ...state, proRewardClaimed: true };
        });
        if (alreadyClaimed) return null;

        const economy = useEconomyStore.getState();
        const streak = economy.streak;
        const mult = streakBonusMultiplier(streak);

        const xp = Math.round(QUEST_XP_REWARD * QUEST_PRO_XP_MULTIPLIER * mult);
        const coins = Math.round(QUEST_COIN_REWARD * QUEST_PRO_COIN_MULTIPLIER * mult);
        const gems = QUEST_PRO_GEMS_GUARANTEED;

        economy.addXP(xp, "daily_task");
        economy.addCoins(coins, 'daily-quest');
        economy.addGems(gems);

        const summary: QuestRewardSummary = { xp, coins, gems, freezes: 0, streakBonusPct: streakBonusPct(streak) };
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
        proRewardClaimed: state.proRewardClaimed,
        lastRewardSummary: state.lastRewardSummary,
      }),
    }
  )
);
