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
  error: boolean;
  answeredDates: string[];
  fetch: () => Promise<void>;
  hasAnsweredToday: () => boolean;
  markAnswered: () => void;
}

const FALLBACK_QUIZ: NewsQuizData = {
  quizId: 'fallback',
  headline: 'הריבית בישראל נותרת על 4.5%',
  question: 'מה קורה להחזר המשכנתא שלך כשהריבית לא יורדת?',
  choices: [
    { id: 'a', text: 'ההחזר החודשי נשאר אותו דבר ולא משתנה' },
    { id: 'b', text: 'ההחזר החודשי עולה יחד עם הריבית' },
    { id: 'c', text: 'ההחזר יורד כי הבנק מפחית את הקרן' },
  ],
  correctChoiceId: 'a',
  explanation: 'כשהריבית נשארת קבועה, גם ההחזר החודשי נשאר קבוע. הבעיה היא שמשכנתאות חדשות ממשיכות להיות יקרות, מה שקשה לרוכשי דירות ראשונה.',
  xpReward: 10,
  coinReward: 5,
  generatedAt: new Date().toISOString(),
};

export const useNewsQuizStore = create<NewsQuizState>()(
  persist(
    (set, get) => ({
      data: null,
      loading: false,
      error: false,
      answeredDates: [],

      fetch: async () => {
        const { loading, data } = get();
        if (loading) return;
        if (data && data.quizId === todayKey()) return;

        set({ loading: true, error: false });
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${getApiBase()}/api/market/news-quiz`, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json() as NewsQuizData;
          set({ data: json, loading: false, error: false });
        } catch {
          // Fallback to local quiz so user never sees white screen
          set({ data: { ...FALLBACK_QUIZ, quizId: todayKey() }, loading: false, error: true });
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