import { create, type StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/zustandStorage";
import type { UserVote, ResolvedOutcome } from "./types";

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
  /** Consecutive "with-crowd" votes — resets when the user breaks. */
  streak: number;
  longestStreak: number;
  /** Total votes across all time. */
  totalVotes: number;

  // Actions
  recordVote: (vote: UserVote, withCrowd: boolean) => void;
  recordOutcome: (outcome: ResolvedOutcome) => void;
  /** Reset everything — for QA and "clear history" UX. */
  clearAll: () => void;
}

type PersistedFields = Pick<
  CrowdWisdomState,
  "votes" | "outcomes" | "votedWithCrowd" | "streak" | "longestStreak" | "totalVotes"
>;

const createCrowdWisdom: StateCreator<CrowdWisdomState> = (set, get) => ({
  votes: {},
  outcomes: {},
  votedWithCrowd: {},
  streak: 0,
  longestStreak: 0,
  totalVotes: 0,

  recordVote: (vote, withCrowd) => {
    const state = get();
    if (state.votes[vote.questionId]) {
      // Single-vote-per-question — ignore double-fires.
      return;
    }
    const newStreak = withCrowd ? state.streak + 1 : 0;
    const newLongest = Math.max(state.longestStreak, newStreak);
    set({
      votes: { ...state.votes, [vote.questionId]: vote },
      votedWithCrowd: { ...state.votedWithCrowd, [vote.questionId]: withCrowd },
      streak: newStreak,
      longestStreak: newLongest,
      totalVotes: state.totalVotes + 1,
    });
  },

  recordOutcome: (outcome) => {
    const state = get();
    set({
      outcomes: { ...state.outcomes, [outcome.questionId]: outcome },
    });
  },

  clearAll: () =>
    set({
      votes: {},
      outcomes: {},
      votedWithCrowd: {},
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