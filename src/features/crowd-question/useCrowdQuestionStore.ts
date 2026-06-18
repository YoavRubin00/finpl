import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { getIsraelDateISO } from '../../utils/israelTime';
import { CROWD_QUESTIONS } from './crowdQuestionsData';
import { getCloudPolls } from './crowdQuestionsApi';
import { buildSelectionContext, selectTodayQuestion } from './selectQuestion';
import type { CrowdOption, CrowdQuestion, MarketSnapshot } from './types';

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
  recordLocalVote: (questionId: string, optionId: CrowdOption['id']) => void;
  reset: () => void;
}

/** Bar's cloud questions when loaded, else the bundled fallback set. */
function activePool(): readonly CrowdQuestion[] {
  const cloud = getCloudPolls();
  return cloud.length > 0 ? cloud : CROWD_QUESTIONS;
}

function findById(id: string): CrowdQuestion {
  const pool = activePool();
  return (
    pool.find((q) => q.id === id) ??
    CROWD_QUESTIONS.find((q) => q.id === id) ??
    pool[pool.length - 1]
  );
}

export const useCrowdQuestionStore = create<CrowdQuestionState>()(
  persist(
    (set, get) => ({
      votedDates: [],
      userVotes: {},
      cachedSelection: null,

      getTodayQuestion: (market?: MarketSnapshot) => {
        const today = getIsraelDateISO();
        const pool = activePool();
        const cached = get().cachedSelection;
        // Reuse today's cached pick only if it still exists in the active pool
        // (a cached local id is dropped once Bar's cloud set loads, and v.v.).
        if (cached && cached.date === today && pool.some((q) => q.id === cached.questionId)) {
          return findById(cached.questionId);
        }
        const ctx = buildSelectionContext(new Date(), market);
        ctx.todayISO = today;
        const id = selectTodayQuestion(pool, ctx);
        set({ cachedSelection: { date: today, questionId: id } });
        return findById(id);
      },

      hasVotedToday: () => {
        return get().votedDates.includes(getIsraelDateISO());
      },

      getUserVoteFor: (questionId: string) => {
        return get().userVotes[questionId] ?? null;
      },

      recordLocalVote: (questionId: string, optionId: CrowdOption['id']) => {
        const today = getIsraelDateISO();
        const state = get();
        if (state.votedDates.includes(today)) return;
        set({
          votedDates: [...state.votedDates, today],
          userVotes: { ...state.userVotes, [questionId]: optionId },
        });
      },

      reset: () => set({ votedDates: [], userVotes: {}, cachedSelection: null }),
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

registerLocalStore('crowd-question-store', useCrowdQuestionStore, 'crowd-question-store');