import type {
  CrowdWisdomQuestion,
  PostVoteSnapshot,
  SentimentSnapshot,
} from "../types";

/**
 * Given a question and the user's chosen choiceId, build a post-vote snapshot:
 *   • Sum the user's vote into the seeded counts so percentages stay coherent.
 *   • Identify the majority choice and whether the user's pick matches it.
 *
 * This is the single source of truth for the "with-crowd / against-crowd"
 * verdict banner shown in ResultCard.
 */
export function computePostVoteSnapshot(
  question: CrowdWisdomQuestion,
  userChoiceId: string,
): PostVoteSnapshot {
  const totalSeedVotes = question.choices.reduce((sum, c) => sum + c.seedVotes, 0);
  const totalVoters = totalSeedVotes + 1; // include the user's vote

  const distribution = question.choices.map((c) => {
    const voteCount = c.seedVotes + (c.id === userChoiceId ? 1 : 0);
    const percent = (voteCount / totalVoters) * 100;
    return { choiceId: c.id, voteCount, percent };
  });

  // Find majority (largest %). Tie-break: first in choices order.
  let majority = distribution[0];
  for (const row of distribution) {
    if (row.percent > majority.percent) majority = row;
  }

  return {
    question,
    distribution,
    totalVoters,
    majorityChoiceId: majority.choiceId,
    userIsWithCrowd: majority.choiceId === userChoiceId,
    userChoiceId,
  };
}

/**
 * Build a sentiment summary for the Bull/Bear gauge.
 * Expects a question with category === "sentiment" and choices keyed by
 * convention: id includes "bull" / "neutral" / "bear" (or "up" / "stay" / "down"
 * as fallbacks for inflation-style sentiment).
 *
 * Returns a needle position in [0, 1] where:
 *   1.0 = fully bullish (100% bull, 0% bear)
 *   0.5 = balanced
 *   0.0 = fully bearish
 */
export function computeSentimentSnapshot(
  question: CrowdWisdomQuestion,
): SentimentSnapshot {
  const totalSeed = question.choices.reduce((s, c) => s + c.seedVotes, 0);
  const totalVoters = totalSeed;

  const findShare = (predicate: (id: string) => boolean): number => {
    const match = question.choices.find((c) => predicate(c.id));
    if (!match || totalVoters === 0) return 0;
    return (match.seedVotes / totalVoters) * 100;
  };

  const bullishPercent = findShare((id) => id.includes("bull") || id.includes("up") || id === "down");
  // "down" treated as bullish for inflation-direction questions where ↓ inflation is good.
  // Keep simple by relying on choice ordering for non-standard sentiment Qs:
  const orderedBullish = question.choices[0]?.seedVotes ?? 0;
  const orderedNeutral = question.choices[1]?.seedVotes ?? 0;
  const orderedBearish = question.choices[2]?.seedVotes ?? 0;

  const bull = totalVoters > 0 ? (orderedBullish / totalVoters) * 100 : 0;
  const neutral = totalVoters > 0 ? (orderedNeutral / totalVoters) * 100 : 0;
  const bear = totalVoters > 0 ? (orderedBearish / totalVoters) * 100 : 0;

  // Needle: bullish weight − bearish weight, normalized to [0, 1].
  const score = (bull - bear + 100) / 200;
  const needlePosition = Math.max(0, Math.min(1, score));

  // Silence unused-var lint if bullishPercent isn't returned in this path.
  void bullishPercent;

  return {
    question,
    bullishPercent: bull,
    neutralPercent: neutral,
    bearishPercent: bear,
    needlePosition,
    totalVoters,
  };
}
