import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";

interface CooldownState {
  lastVictoryAt: number | null;
  lastAttemptAt: number | null;
  totalVictories: number;
  recordVictory: () => void;
  recordAttempt: () => void;
  isOnCooldown: () => boolean;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const useDiamondHandsCooldown = create<CooldownState>()(
  persist(
    (set, get) => ({
      lastVictoryAt: null,
      lastAttemptAt: null,
      totalVictories: 0,
      recordVictory: () => {
        set((s) => ({
          lastVictoryAt: Date.now(),
          lastAttemptAt: Date.now(),
          totalVictories: s.totalVictories + 1,
        }));
      },
      recordAttempt: () => {
        set({ lastAttemptAt: Date.now() });
      },
      isOnCooldown: () => {
        const last = get().lastAttemptAt;
        if (!last) return false;
        return Date.now() - last < COOLDOWN_MS;
      },
    }),
    {
      name: "diamond-hands-cooldown",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
