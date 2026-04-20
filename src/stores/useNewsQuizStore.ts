import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/zustandStorage';
import { getApiBase } from '../db/apiBase';
import type { NewsQuizData } from '../features/finfeed/liveMarketTypes';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface NewsQuizState {
  data: NewsQuizData | null;
  loading: boolean;
  answeredDates: string[];
  fetch: () => Promise<void>;
  hasAnsweredToday: () => boolean;
  markAnswered: () => void;
}

export const useNewsQuizStore = create<NewsQuizState>()(
  persist(
    (set, get) => ({
      data: null,
      loading: false,
      answeredDates: [],

      fetch: async () => {
        const { loading, data } = get();
        if (loading) return;
        if (data && data.quizId === todayKey()) return;

        set({ loading: true });
        try {
          const res = await fetch(`${getApiBase()}/api/market/news-quiz`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json() as NewsQuizData;
          set({ data: json, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      hasAnsweredToday: () => get().answeredDates.includes(todayKey()),

      markAnswered: () => {
        const today = todayKey();
        const { answeredDates } = get();
        if (!answeredDates.includes(today)) {
          set({ answeredDates: [...answeredDates.slice(-30), today] });
        }
      },
    }),
    {
      name: 'news-quiz-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ answeredDates: state.answeredDates }),
    },
  ),
);