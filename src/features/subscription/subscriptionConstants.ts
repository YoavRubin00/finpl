// Shared types and constants extracted from the legacy useSubscriptionStore.
// These do NOT depend on React or Zustand — import freely from anywhere.

export type GatedFeature = "simulator" | "arena" | "chat" | "aiInsights" | "saved_items" | "breaking-news";

export const BASIC_LIMITS: Record<GatedFeature, number> = {
  simulator: 3,
  arena: 3,
  chat: 3,
  aiInsights: 0,
  saved_items: 0,
  // The daily news challenge itself is free; this gate is only used when the
  // user taps the "open the Pro chest" CTA inside the challenge sheet, which
  // triggers the standard upgrade modal.
  "breaking-news": 0,
};

const HEART_REFILL_MS = 5 * 60 * 60 * 1000; // 5 hours per heart

/** Time until next heart refill in ms */
export function getTimeUntilNextHeart(lastLostAt: string | null, currentHearts: number): number {
  const MAX_HEARTS = 5;
  if (!lastLostAt || currentHearts >= MAX_HEARTS) return 0;
  const elapsed = Math.max(0, Date.now() - new Date(lastLostAt).getTime());
  const remaining = HEART_REFILL_MS - (elapsed % HEART_REFILL_MS);
  return remaining;
}
