/**
 * Honest-data policy (Yoav, 2026-07-02): zero invented numbers in the friends tab.
 * Any vote / participant count may only be displayed once it reflects at least
 * MIN_VOTES_FOR_COUNT real votes. Below that — the label is hidden entirely
 * (better no number than a fake number).
 */
export const MIN_VOTES_FOR_COUNT = 100;

/**
 * Formats a REAL vote/participant count for display.
 * Returns null when the count is below the honesty threshold — callers must
 * hide the entire label in that case.
 */
export function formatVoteCount(realVotes: number): string | null {
  if (!Number.isFinite(realVotes) || realVotes < MIN_VOTES_FOR_COUNT) return null;
  return realVotes.toLocaleString('he-IL');
}
