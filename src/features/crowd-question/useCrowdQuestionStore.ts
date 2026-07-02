import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { getIsraelDateISO } from '../../utils/israelTime';
import { CROWD_QUESTIONS } from './crowdQuestionsData';
import { getCloudPolls } from './crowdQuestionsApi';
import { buildSelectionContext, selectTodayQuestion } from './selectQuestion';
import { computeVerdict, type MarketDirection } from '../crowd-wisdom/lib/computeVerdict';
import type { CrowdOption, CrowdQuestion, MarketSnapshot } from './types';

interface CachedSelection {
  date: string;
  questionId: string;
}

/** Voting-streak milestones — REAL personal daily streak (votedDates), each
 *  grants a small, restrained coin reward (Audrey-safe, not casino). */
const STREAK_MILESTONES: ReadonlyArray<{ days: number; coins: number }> = [
  { days: 3, coins: 30 },
  { days: 7, coins: 70 },
  { days: 14, coins: 150 },
];

/** Coins granted when a weekly directional pick is proven right by the market
 *  (A2). The outcome is real market data; the reward is the user's own pick. */
const MARKET_WIN_COINS = 50;

type ResolvedVerdict = 'right' | 'wrong';

interface CrowdQuestionState {
  votedDates: string[];
  userVotes: Record<string, CrowdOption['id']>;
  /** epoch-ms when each question was voted — lets A2 tell whether the market
   *  period has genuinely elapsed before resolving (no same-day resolution). */
  voteTimestamps: Record<string, number>;
  /** Highest voting-streak milestone (in days) already paid — keeps A1 rewards
   *  idempotent. Resets to 0 when the streak breaks so a fresh streak re-earns. */
  lastStreakMilestoneRewarded: number;
  /** questionId → market verdict, once resolved. Prevents double-grant (A2). */
  resolvedVotes: Record<string, ResolvedVerdict>;
  /** Set on a market win — celebrated on next entry to CrowdWisdomCard. */
  pendingWin: { questionId: string; coins: number } | null;
  cachedSelection: CachedSelection | null;

  getTodayQuestion: (market?: MarketSnapshot) => CrowdQuestion;
  hasVotedToday: () => boolean;
  getUserVoteFor: (questionId: string) => CrowdOption['id'] | null;
  recordLocalVote: (questionId: string, optionId: CrowdOption['id']) => void;
  /** Consecutive days (Israel time) the user actually voted — 100% self-data. */
  getVotingStreak: () => number;
  /** Grant the next unclaimed streak milestone if reached. Idempotent. */
  claimStreakMilestone: () => { milestone: number; coins: number } | null;
  /** Resolve a directional index vote against a REAL live market direction.
   *  Grants coins + queues a celebration on a win. No-op (returns null) when
   *  the period hasn't elapsed, the vote is already resolved, or the question
   *  isn't a pure green/red index question. */
  resolveVoteWithMarket: (questionId: string, direction: MarketDirection) => { coins: number } | null;
  clearPendingWin: () => void;
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

/**
 * Consecutive-day voting streak ending today (or yesterday, if today isn't
 * voted yet). Anchored at noon-UTC so the day-by-day walk never drifts across
 * DST / device-timezone boundaries (same approach as deriveStreakFromDates).
 */
function computeVotingStreak(votedDates: string[]): number {
  if (votedDates.length === 0) return 0;
  const set = new Set(votedDates);
  const today = getIsraelDateISO();
  const yesterday = getIsraelDateISO(new Date(Date.now() - 86_400_000));
  let cursorISO: string;
  if (set.has(today)) cursorISO = today;
  else if (set.has(yesterday)) cursorISO = yesterday;
  else return 0;

  let cursorMs = new Date(`${cursorISO}T12:00:00Z`).getTime();
  let count = 0;
  while (count <= 400) {
    const iso = getIsraelDateISO(new Date(cursorMs));
    if (!set.has(iso)) break;
    count += 1;
    cursorMs -= 86_400_000;
  }
  return count;
}

/** Fire-and-forget coin grant, lazily required to avoid an eval-time cycle
 *  with the (heavy) economy store. */
function grantCoins(amount: number): void {
  if (amount <= 0) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const economyMod = require('../economy/useEconomyUIStore') as typeof import('../economy/useEconomyUIStore');
    economyMod.useEconomyUIStore.getState().addCoins(amount);
  } catch {
    /* non-fatal — celebration still shows the real earned amount */
  }
}

export const useCrowdQuestionStore = create<CrowdQuestionState>()(
  persist(
    (set, get) => ({
      votedDates: [],
      userVotes: {},
      voteTimestamps: {},
      lastStreakMilestoneRewarded: 0,
      resolvedVotes: {},
      pendingWin: null,
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
          voteTimestamps: { ...state.voteTimestamps, [questionId]: Date.now() },
        });
      },

      getVotingStreak: () => computeVotingStreak(get().votedDates),

      claimStreakMilestone: () => {
        const streak = computeVotingStreak(get().votedDates);
        const last = get().lastStreakMilestoneRewarded;

        // Streak broken (below the smallest milestone) → reset the ladder so a
        // fresh streak can re-earn. Requires 3+ REAL consecutive days each time.
        if (streak < STREAK_MILESTONES[0].days) {
          if (last !== 0) set({ lastStreakMilestoneRewarded: 0 });
          return null;
        }

        // Highest newly-reached milestone.
        let reward: { milestone: number; coins: number } | null = null;
        for (const m of STREAK_MILESTONES) {
          if (streak >= m.days && m.days > last) {
            reward = { milestone: m.days, coins: m.coins };
          }
        }
        if (!reward) return null;

        set({ lastStreakMilestoneRewarded: reward.milestone });
        grantCoins(reward.coins);
        return reward;
      },

      resolveVoteWithMarket: (questionId, direction) => {
        const state = get();
        const choice = state.userVotes[questionId];
        if (!choice) return null;
        if (state.resolvedVotes[questionId]) return null;

        // Only resolve once the market period has genuinely elapsed: the vote
        // must have been cast on an EARLIER Israel date (no same-day "close").
        const ts = state.voteTimestamps[questionId];
        if (!ts) return null; // legacy vote without a timestamp — can't honestly resolve
        if (getIsraelDateISO(new Date(ts)) >= getIsraelDateISO()) return null;

        const verdict = computeVerdict(findById(questionId), direction, choice);
        if (!verdict) return null; // not a pure directional index question

        set({
          resolvedVotes: {
            ...state.resolvedVotes,
            [questionId]: verdict.userWasRight ? 'right' : 'wrong',
          },
        });

        if (!verdict.userWasRight) return null;
        grantCoins(MARKET_WIN_COINS);
        set({ pendingWin: { questionId, coins: MARKET_WIN_COINS } });
        return { coins: MARKET_WIN_COINS };
      },

      clearPendingWin: () => set({ pendingWin: null }),

      reset: () =>
        set({
          votedDates: [],
          userVotes: {},
          voteTimestamps: {},
          lastStreakMilestoneRewarded: 0,
          resolvedVotes: {},
          pendingWin: null,
          cachedSelection: null,
        }),
    }),
    {
      name: 'crowd-question-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        votedDates: state.votedDates,
        userVotes: state.userVotes,
        voteTimestamps: state.voteTimestamps,
        lastStreakMilestoneRewarded: state.lastStreakMilestoneRewarded,
        resolvedVotes: state.resolvedVotes,
        cachedSelection: state.cachedSelection,
        // pendingWin is session-only (celebrated once, then cleared).
      }),
    },
  ),
);

registerLocalStore('crowd-question-store', useCrowdQuestionStore, 'crowd-question-store');
