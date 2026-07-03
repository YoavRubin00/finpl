/**
 * Type definitions for the Crowd Wisdom (חכמת המונים) feature.
 *
 * Conceptual model:
 *   - A QUESTION has multiple CHOICES.
 *   - A user VOTES once per question; the choice id is recorded.
 *   - After the question CLOSES (timer expires or admin-resolved), a real-world
 *     OUTCOME is set, which lets us mark each user's vote as "correct" or
 *     "incorrect" and update their lifetime accuracy/streak.
 */

export type CrowdWisdomCategory = "yes_no" | "sentiment" | "choice" | "forecast";

export interface CrowdWisdomChoice {
  id: string;
  label: string;
  /** Optional emoji or short symbol shown next to label. */
  glyph?: string;
  /** Seed vote count — UI shows current distribution after the user votes. */
  seedVotes: number;
  /** Color hint for bars/dots in the post-vote view. */
  accentColor: string;
}

export interface CrowdWisdomQuestion {
  id: string;
  category: CrowdWisdomCategory;
  /** Hebrew question text, ≤80 chars. */
  prompt: string;
  /** Optional ticker / context chip (e.g. "NVDA · $875.20 · עלתה 5.1%"). */
  contextChip?: string;
  choices: CrowdWisdomChoice[];
  /** Total seed voters — UI shows "X משקיעים כבר הצביעו". */
  seedTotalVoters: number;
  /** Hours from "now" the question closes (legacy hint; the real close is derived
   *  by questionSchedule from the horizon, or by `closesAt` when set). */
  closesInHours: number;
  /**
   * Optional ABSOLUTE close moment (ISO 8601). When set it overrides the
   * horizon-derived close in questionSchedule — for one-off events tied to a
   * known real-world date (e.g. a scheduled Bank-of-Israel rate decision), so
   * the question closes BEFORE the outcome is public and then stays closed.
   */
  closesAt?: string;
  /**
   * True only for questions with an OBJECTIVELY MEASURABLE outcome (a real
   * market close / price / rate) — the ONLY questions you can stake coins on.
   * Sentiment / personal-choice / subjective questions are vote-only (Yoav
   * 2026-07-03: "אי אפשר להמר על סנטימנט ודברים לא מדידים"). Drives both the
   * BetPanel gate (client) and the settlement resolver (server).
   */
  bettable?: boolean;
  /** Optional educational concept shown as a yellow tooltip. */
  educational?: {
    title: string;
    body: string;
    example?: string;
  };
}

/** Persisted vote record — one per question id. */
export interface UserVote {
  questionId: string;
  choiceId: string;
  /** epoch ms when the vote was placed. */
  votedAt: number;
}

/**
 * Persisted record of a coin prediction placed on a bettable question — mirrors
 * the server crowd_bets row (one per user per question) so the placed state
 * survives app restarts and the stake CTA never re-offers a taken position.
 */
export interface PlacedCoinBet {
  /** Coins staked. */
  stake: number;
  /** Parimutuel multiplier locked at placement. */
  lockedOdds: number;
  /** stake × lockedOdds, rounded server-side. */
  potentialPayout: number;
  /** epoch ms when the prediction was locked. */
  placedAt: number;
}

/** Filled in by a resolver once the real-world outcome is known. */
export interface ResolvedOutcome {
  questionId: string;
  /** Choice id that matched reality. null when the resolver couldn't determine. */
  winningChoiceId: string | null;
  /** Free-text describing what happened (Hebrew). */
  outcomeText: string;
  resolvedAt: number;
}

/** Pre-vote shape returned to the UI; choices include only seeded counts. */
export type PreVoteSnapshot = CrowdWisdomQuestion;

/** Post-vote shape returned to the UI; choices include up-to-date %s. */
export interface PostVoteSnapshot {
  question: CrowdWisdomQuestion;
  /** %s sum to 100. */
  distribution: Array<{
    choiceId: string;
    percent: number;
    voteCount: number;
  }>;
  /** Total voters including the user. */
  totalVoters: number;
  /** Choice id that holds the majority (largest %). */
  majorityChoiceId: string;
  /** True if the user voted for the majority choice. */
  userIsWithCrowd: boolean;
  /** Choice id the user picked. */
  userChoiceId: string;
}

/** History row shown in CrowdWisdomHistoryScreen. */
export interface HistoryEntry {
  question: CrowdWisdomQuestion;
  userVote: UserVote;
  /** undefined when the question hasn't been resolved yet. */
  outcome?: ResolvedOutcome;
  /** Crowd majority at the time the user voted (cached snapshot). */
  crowdMajority: {
    choiceId: string;
    percent: number;
  };
}

/** Sentiment summary feeding the Bull/Bear gauge. */
export interface SentimentSnapshot {
  question: CrowdWisdomQuestion;
  bullishPercent: number;
  neutralPercent: number;
  bearishPercent: number;
  /** Position in [0,1] for the gauge needle, where 1 = fully bullish. */
  needlePosition: number;
  totalVoters: number;
}
