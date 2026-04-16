import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from '../economy/useEconomyStore';
import type { MacroEvent } from './types';

const XP_PER_CORRECT   = 10;
const COINS_PER_CORRECT = 25;
const STREAK_BONUS_AT   = 5;
const STREAK_BONUS_COINS = 75;
const SESSION_LIMIT = 3;
export const MACRO_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

interface MacroEventState {
  answeredIds: string[];
  correctCount: number;
  totalAnswered: number;
  currentStreak: number;
  macroSessionCount: number;
  lastMacroSessionTime: number;

  recordAnswer: (id: string, wasCorrect: boolean) => { streakBonus: boolean };
  getNextUnanswered: (events: MacroEvent[]) => MacroEvent | null;
  getUnanswered: (events: MacroEvent[], limit: number) => MacroEvent[];
  canAnswerMacro: (isPro: boolean) => boolean;
  resetSessionIfCooldownElapsed: () => void;
  reset: () => void;
}

export const useMacroEventStore = create<MacroEventState>()(
  persist(
    (set, get) => ({
      answeredIds:   [],
      correctCount:  0,
      totalAnswered: 0,
      currentStreak: 0,
      macroSessionCount: 0,
      lastMacroSessionTime: 0,

      recordAnswer: (id, wasCorrect) => {
        const { currentStreak } = get();
        const newStreak = wasCorrect ? currentStreak + 1 : 0;
        const streakBonus = wasCorrect && newStreak === STREAK_BONUS_AT;

        set((s) => {
          const elapsed = Date.now() - s.lastMacroSessionTime;
          const sessionReset = s.lastMacroSessionTime === 0 || elapsed >= MACRO_COOLDOWN_MS;
          return {
            answeredIds:   [...s.answeredIds, id],
            correctCount:  wasCorrect ? s.correctCount + 1 : s.correctCount,
            totalAnswered: s.totalAnswered + 1,
            currentStreak: newStreak,
            macroSessionCount: sessionReset ? 1 : s.macroSessionCount + 1,
            lastMacroSessionTime: Date.now(),
          };
        });

        // Economy rewards
        useEconomyStore.getState().addXP(wasCorrect ? XP_PER_CORRECT : 0, 'quiz_correct');
        useEconomyStore.getState().addCoins(wasCorrect ? COINS_PER_CORRECT : 0);
        if (streakBonus) {
          useEconomyStore.getState().addCoins(STREAK_BONUS_COINS);
        }

        return { streakBonus };
      },

      getNextUnanswered: (events) => {
        const { answeredIds } = get();
        return events.find((e) => !answeredIds.includes(e.id)) ?? null;
      },

      getUnanswered: (events, limit) => {
        const { answeredIds } = get();
        return events.filter((e) => !answeredIds.includes(e.id)).slice(0, limit);
      },

      canAnswerMacro: (isPro) => {
        if (isPro) return true;
        const { macroSessionCount, lastMacroSessionTime } = get();
        if (lastMacroSessionTime === 0) return true;
        if (Date.now() - lastMacroSessionTime >= MACRO_COOLDOWN_MS) return true;
        return macroSessionCount < SESSION_LIMIT;
      },

      resetSessionIfCooldownElapsed: () => {
        const { lastMacroSessionTime } = get();
        if (lastMacroSessionTime === 0) return;
        if (Date.now() - lastMacroSessionTime >= MACRO_COOLDOWN_MS) {
          set({ macroSessionCount: 0, lastMacroSessionTime: 0 });
        }
      },

      reset: () =>
        set({ answeredIds: [], correctCount: 0, totalAnswered: 0, currentStreak: 0, macroSessionCount: 0, lastMacroSessionTime: 0 }),
    }),
    {
      name: 'macro-event-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
