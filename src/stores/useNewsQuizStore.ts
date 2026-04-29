import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/zustandStorage';
import { getApiBase } from '../db/apiBase';
import type { NewsQuizData } from '../features/finfeed/liveMarketTypes';

/** YYYY-MM-DD in Asia/Jerusalem so the daily refresh aligns with users' local day. */
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

interface NewsQuizState {
  data: NewsQuizData | null;
  loading: boolean;
  error: boolean;
  answeredDates: string[];
  lastFetched: number;
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
      lastFetched: 0,

      fetch: async () => {
        const { loading, data } = get();
        if (loading) return;

        const today = todayKey();
        // Skip if we already have today's real (non-fallback) quiz cached.
        // Fallback responses (isFallback) trigger a re-fetch so users get real content as soon as the upstream recovers.
        if (data && data.quizId.startsWith(today) && !data.isFallback) return;

        set({ loading: true, error: false });
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${getApiBase()}/api/market/news-quiz`, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json() as NewsQuizData;
          set({ data: json, loading: false, error: false, lastFetched: Date.now() });
        } catch {
          // Network error — keep showing whatever we had, or use a local fallback so the card never blanks.
          set((state) => ({
            data: state.data ?? { ...FALLBACK_QUIZ, quizId: `fallback-${todayKey()}`, isFallback: true },
            loading: false,
            error: true,
          }));
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