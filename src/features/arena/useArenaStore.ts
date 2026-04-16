import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from "../economy/useEconomyStore";
import { DAILY_CHALLENGES } from "./arenaData";
import type { ChallengeProgress } from "./types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Keyed by challenge id. */
type ProgressMap = Record<string, ChallengeProgress>;

interface ArenaState {
  progress: ProgressMap;
  completeChallenge: (challengeId: string) => void;
  isChallengeCompleted: (challengeId: string) => boolean;
}

const initialProgress: ProgressMap = Object.fromEntries(
  DAILY_CHALLENGES.map((c) => [c.id, { completedDate: null }])
);

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      progress: initialProgress,

      completeChallenge: (challengeId: string) => {
        const today = todayISO();
        const existing = get().progress[challengeId];

        // Idempotent: already completed today
        if (existing?.completedDate === today) return;

        const challenge = DAILY_CHALLENGES.find((c) => c.id === challengeId);
        if (!challenge) return;

        // Award coins and XP via the economy store directly
        const economy = useEconomyStore.getState();
        economy.addXP(challenge.xpReward, "challenge_complete");
        economy.addCoins(challenge.coinReward);

        // If this is the first challenge completed today, also trigger the
        // daily task streak logic (XP + base Coins + streak increment).
        const anyCompletedToday = Object.values(get().progress).some(
          (p) => p.completedDate === today
        );
        if (!anyCompletedToday) {
          economy.completeDailyTask();
        }

        set((state) => ({
          progress: {
            ...state.progress,
            [challengeId]: { completedDate: today },
          },
        }));
      },

      isChallengeCompleted: (challengeId: string): boolean => {
        const today = todayISO();
        return get().progress[challengeId]?.completedDate === today;
      },
    }),
    {
      name: "arena-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ progress: state.progress }),
    }
  )
);
