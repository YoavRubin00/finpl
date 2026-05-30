// Shared types and constants extracted from the legacy useSubscriptionStore.
// These do NOT depend on React or Zustand — import freely from anywhere.

export type GatedFeature =
  | "simulator"
  | "arena"
  | "chat"
  | "aiInsights"
  | "saved_items"
  | "breaking-news"
  | "shark-voice"
  | "analyst-quick"
  | "analyst-deep"
  | "payslip";

// Free-tier caps per gated feature. The CADENCE varies by feature:
//   simulator/arena/chat/analyst-quick — per DAY (reset at local midnight)
//   analyst-deep                       — per WEEK (reset on ISO week change)
//   aiInsights                         — per MONTH (reset on calendar month)
//   breaking-news                      — concurrent TICKER cap (not time-based)
//   saved_items/shark-voice            — lifetime hard block (0 = always paywall)
// useUsageStore.canUse() enforces the cadence — see that file for the matching
// reset logic. Changing a number here is a no-op for the user UX unless the
// store knows to track it.
//
// Sample Loop strategy (Moni 2026-05-30): give Free users a TASTE of every
// AI feature so the paywall has converted curiosity, not blocked interest.
// Zero-access is leaving conversion on the table.
export const BASIC_LIMITS: Record<GatedFeature, number> = {
  simulator: 3,
  arena: 3,
  chat: 2,              // 2 chat messages per DAY for Free
  aiInsights: 1,        // 1 weekly insight per CALENDAR MONTH for Free
  saved_items: 0,       // No taste — hard Pro lock
  // One ticker tracked for Free (preview of the daily summary); Pro caps at
  // BREAKING_NEWS_PRO_TICKER_CAP. BreakingNewsScreen reads this directly.
  "breaking-news": 1,
  // No live free taste yet — Shark voice is expensive per session.
  "shark-voice": 0,
  "analyst-quick": 2,   // 2 quick analyses per DAY for Free
  "analyst-deep": 1,    // 1 deep analysis per WEEK for Free
  payslip: 1,           // 1 payslip analysis per MONTH for Free
};

/** How many tickers a Pro user can track for daily Breaking News summaries. */
export const BREAKING_NEWS_PRO_TICKER_CAP = 5;

// Pro-tier soft caps for expensive AI features. Only features listed here
// are capped for Pro; everything else stays unlimited. Goal (Moni 2026-05-30):
// keep AI compute costs predictable per-user — a single deep stock analysis
// fans out 4-6 model calls (live quote → quick context → deep reasoning →
// follow-up suggestions). 5/week per Pro user keeps the p99 cost well
// inside the ₪29/month subscription margin without hurting genuine power
// users (avg Pro use is 1-2/week per Slotomania/Duolingo Super telemetry
// from comparable AI features).
export const PRO_LIMITS: Partial<Record<GatedFeature, number>> = {
  "analyst-deep": 5,    // 5 deep analyses per WEEK for Pro
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
