import { create, type StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import { requestGuestGate } from "../auth/guestValueGate";
import type { UserVote, ResolvedOutcome, PlacedCoinBet } from "./types";

/**
 * Instant coin payout for answering a crowd-wisdom question. Single source of
 * truth — imported by CrowdWisdomScreen and SliderForecastCard so the reward
 * can't drift between the two vote paths.
 */
export const VOTE_COIN_REWARD = 100;

/**
 * Persisted state for Crowd Wisdom — the user's lifetime voting history,
 * accuracy stats, and current "with-crowd streak". Backed by MMKV (mobile)
 * or AsyncStorage (web) via the shared zustandStorage adapter.
 */
interface CrowdWisdomState {
  /** Map of questionId → vote record. */
  votes: Record<string, UserVote>;
  /** Map of questionId → resolved outcome (when the real-world result is in). */
  outcomes: Record<string, ResolvedOutcome>;
  /** Map of questionId → was the user with the majority at vote time. */
  votedWithCrowd: Record<string, boolean>;
  /**
   * Map of questionId → coin prediction locked on the server. Persisted so an
   * app restart never re-offers the stake CTA for a question the server already
   * holds a bet on (re-placing would 409).
   */
  placedBets: Record<string, PlacedCoinBet>;
  /** Consecutive "with-crowd" votes — resets when the user breaks. */
  streak: number;
  longestStreak: number;
  /** Total votes across all time. */
  totalVotes: number;

  // Actions
  /**
   * Record a vote. `withCrowd`: true extends the with-crowd streak, false
   * breaks it, null is STREAK-NEUTRAL — the vote still counts but there is no
   * majority to be with/against (e.g. the slider forecast), so the current
   * streak is left untouched.
   */
  recordVote: (vote: UserVote, withCrowd: boolean | null) => void;
  recordOutcome: (outcome: ResolvedOutcome) => void;
  /** Mirror a successful server bet placement — one per question, idempotent. */
  recordPlacedBet: (questionId: string, bet: PlacedCoinBet) => void;
  /** Reset everything — for QA and "clear history" UX. */
  clearAll: () => void;
}

type PersistedFields = Pick<
  CrowdWisdomState,
  "votes" | "outcomes" | "votedWithCrowd" | "placedBets" | "streak" | "longestStreak" | "totalVotes"
>;

const createCrowdWisdom: StateCreator<CrowdWisdomState> = (set, get) => ({
  votes: {},
  outcomes: {},
  votedWithCrowd: {},
  placedBets: {},
  streak: 0,
  longestStreak: 0,
  totalVotes: 0,

  recordVote: (vote, withCrowd) => {
    const state = get();
    if (state.votes[vote.questionId]) {
      // Single-vote-per-question — ignore double-fires.
      return;
    }
    // null = streak-neutral: no crowd majority exists for this vote (slider
    // forecasts), so the streak neither extends nor resets.
    const newStreak = withCrowd === null ? state.streak : withCrowd ? state.streak + 1 : 0;
    const newLongest = Math.max(state.longestStreak, newStreak);
    set({
      votes: { ...state.votes, [vote.questionId]: vote },
      votedWithCrowd:
        withCrowd === null
          ? state.votedWithCrowd
          : { ...state.votedWithCrowd, [vote.questionId]: withCrowd },
      streak: newStreak,
      longestStreak: newLongest,
      totalVotes: state.totalVotes + 1,
    });
    // Guest value-gate policy (Yoav 2026-07-03): a cast vote is a completed
    // value action. Delay past the distribution reveal so the reward moment
    // lands first; requestGuestGate self-guards (guest-only + 2-min cooldown).
    setTimeout(() => { requestGuestGate('crowd_vote'); }, 2_500);
  },

  recordOutcome: (outcome) => {
    const state = get();
    set({
      outcomes: { ...state.outcomes, [outcome.questionId]: outcome },
    });
  },

  recordPlacedBet: (questionId, bet) => {
    const state = get();
    if (state.placedBets[questionId]) {
      // One prediction per question (server enforces via unique index) —
      // ignore double-fires.
      return;
    }
    set({ placedBets: { ...state.placedBets, [questionId]: bet } });
  },

  clearAll: () =>
    set({
      votes: {},
      outcomes: {},
      votedWithCrowd: {},
      placedBets: {},
      streak: 0,
      longestStreak: 0,
      totalVotes: 0,
    }),
});

export const useCrowdWisdomStore = create<CrowdWisdomState>()(
  persist(createCrowdWisdom, {
    name: "crowd-wisdom-store",
    storage: createJSONStorage(() => zustandStorage),
    partialize: (state: CrowdWisdomState): PersistedFields => ({
      votes: state.votes,
      outcomes: state.outcomes,
      votedWithCrowd: state.votedWithCrowd,
      placedBets: state.placedBets,
      streak: state.streak,
      longestStreak: state.longestStreak,
      totalVotes: state.totalVotes,
    }),
  }),
);

/**
 * Derived selector: monthly accuracy.
 * Counts resolved votes from the last 30 days where the user's choice matches
 * the resolved winning choice. Returns 0 when there are no resolved votes.
 */
export function selectMonthlyAccuracy(state: CrowdWisdomState): {
  accuracy: number;
  resolvedCount: number;
} {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let correct = 0;
  let resolved = 0;
  for (const vote of Object.values(state.votes)) {
    if (vote.votedAt < cutoff) continue;
    const outcome = state.outcomes[vote.questionId];
    if (!outcome || !outcome.winningChoiceId) continue;
    resolved += 1;
    if (outcome.winningChoiceId === vote.choiceId) correct += 1;
  }
  if (resolved === 0) return { accuracy: 0, resolvedCount: 0 };
  return { accuracy: correct / resolved, resolvedCount: resolved };
}