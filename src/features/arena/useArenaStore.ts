import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { useEconomyUIStore } from "../economy/useEconomyUIStore";
import { markDailyActivityCompleted } from "../economy/useStreak";
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
  reset: () => void;
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

        // Award coins and XP via the economy UI store
        const economy = useEconomyUIStore.getState();
        economy.addXP(challenge.xpReward, "challenge_complete");
        economy.addCoins(challenge.coinReward);

        // If this is the first challenge completed today, also trigger the
        // daily task streak logic. Use the unified helper (local popup + server
        // sync for notifications/cross-device) — a bare completeDailyTask() only
        // updated local state, so an Arena-only day never reached the server.
        const anyCompletedToday = Object.values(get().progress).some(
          (p) => p.completedDate === today
        );
        if (!anyCompletedToday) {
          markDailyActivityCompleted();
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

      reset: () => set({ progress: initialProgress }),
    }),
    {
      name: "arena-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ progress: state.progress }),
    }
  )
);

registerLocalStore('arena-store', useArenaStore, 'arena-store');
