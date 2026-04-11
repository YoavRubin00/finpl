import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyQuiz, DailyQuizState } from './dailyQuizTypes';
import { useEconomyStore } from '../economy/useEconomyStore';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useDailyQuizStore = create<DailyQuizState>()(
  persist(
    (set, get) => ({
      todayQuiz: null,
      answeredDates: [],
      correctCount: 0,
      totalAnswered: 0,
      streak: 0,

      hasAnsweredToday: () => {
        return get().answeredDates.includes(todayStr());
      },

      answerQuiz: (date: string, wasCorrect: boolean) => {
        const state = get();
        if (state.answeredDates.includes(date)) return;

        const newStreak = wasCorrect ? state.streak + 1 : 0;
        const xpReward = wasCorrect ? 50 : 0;
        const coinReward = wasCorrect ? 120 : 0;
        const streakBonus = wasCorrect && newStreak >= 3 ? 80 : 0;

        if (wasCorrect) {
          const economy = useEconomyStore.getState();
          economy.addXP(xpReward, 'daily_task');
          economy.addCoins(coinReward + streakBonus);
        }

        set({
          answeredDates: [...state.answeredDates, date],
          correctCount: state.correctCount + (wasCorrect ? 1 : 0),
          totalAnswered: state.totalAnswered + 1,
          streak: newStreak,
        });
      },

      setTodayQuiz: (quiz: DailyQuiz) => {
        set({ todayQuiz: quiz });
      },
    }),
    {
      name: 'daily-quiz-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        answeredDates: state.answeredDates,
        correctCount: state.correctCount,
        totalAnswered: state.totalAnswered,
        streak: state.streak,
        todayQuiz: state.todayQuiz,
      }),
    },
  ),
);
