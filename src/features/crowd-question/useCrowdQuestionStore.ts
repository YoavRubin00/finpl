import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { CROWD_QUESTIONS } from './crowdQuestionsData';
import { buildSelectionContext, selectTodayQuestion } from './selectQuestion';
import type { CrowdOption, CrowdQuestion, MarketSnapshot } from './types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CachedSelection {
  date: string;
  questionId: string;
}

interface CrowdQuestionState {
  votedDates: string[];
  userVotes: Record<string, CrowdOption['id']>;
  cachedSelection: CachedSelection | null;

  getTodayQuestion: (market?: MarketSnapshot) => CrowdQuestion;
  hasVotedToday: () => boolean;
  getUserVoteFor: (questionId: string) => CrowdOption['id'] | null;
  vote: (questionId: string, optionId: CrowdOption['id']) => void;
}

function findById(id: string): CrowdQuestion {
  return CROWD_QUESTIONS.find((q) => q.id === id) ?? CROWD_QUESTIONS[CROWD_QUESTIONS.length - 1];
}

export const useCrowdQuestionStore = create<CrowdQuestionState>()(
  persist(
    (set, get) => ({
      votedDates: [],
      userVotes: {},
      cachedSelection: null,

      getTodayQuestion: (market?: MarketSnapshot) => {
        const today = todayStr();
        const cached = get().cachedSelection;
        if (cached && cached.date === today) {
          return findById(cached.questionId);
        }
        const ctx = buildSelectionContext(new Date(), market);
        const id = selectTodayQuestion(CROWD_QUESTIONS, ctx);
        set({ cachedSelection: { date: today, questionId: id } });
        return findById(id);
      },

      hasVotedToday: () => {
        return get().votedDates.includes(todayStr());
      },

      getUserVoteFor: (questionId: string) => {
        return get().userVotes[questionId] ?? null;
      },

      vote: (questionId: string, optionId: CrowdOption['id']) => {
        const today = todayStr();
        const state = get();
        if (state.votedDates.includes(today)) return;
        set({
          votedDates: [...state.votedDates, today],
          userVotes: { ...state.userVotes, [questionId]: optionId },
        });
      },
    }),
    {
      name: 'crowd-question-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        votedDates: state.votedDates,
        userVotes: state.userVotes,
        cachedSelection: state.cachedSelection,
      }),
    },
  ),
);