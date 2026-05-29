/**
 * Shared types for the Daily News Challenge feature.
 *
 * Mirror of the server's `DailyChallengePayload` (in
 * app/api/daily-news-challenge/_lib.ts), kept here so the client doesn't
 * have to import from server code.
 */

export interface ChallengeItem {
  /** Paraphrased headline — Gen-Z Hebrew, NOT verbatim from source. */
  headlineHe: string;
  /** 2-sentence summary. */
  summaryHe: string;
  /** Source attribution name (e.g. "Calcalist"). Stored in DB; UI hides it. */
  source: string;
  sourceUrl: string;
  /** Higgsfield-generated brand-styled image, or null → render gradient placeholder. */
  imageUrl: string | null;
  explanation: string;
  historicalExample: string;
  /** 1-paragraph briefing handed to the AI mentor when the user opens the chat overlay. */
  chatContext: string;

  /* ───── Blanked-Headline format (v2) ─────
   * The headline with one central entity replaced by `____` (4 underscores).
   * User picks which chip fills the blank — curiosity-gap reveal pattern. */
  blankedHeadline: string;
  /** The entity that was blanked out (matches one of `chips`). */
  blankedEntity: string;
  /** 4 candidates — exactly one (`chips[correctChipIdx]`) equals `blankedEntity`. */
  chips: [string, string, string, string];
  correctChipIdx: 0 | 1 | 2 | 3;

  /* ───── Legacy fields (v1) — optional for backward compat ─────
   * Cached payloads written before the v2 cron deploy still carry these.
   * UI falls back to them if `blankedHeadline` is missing. Drop after the
   * cache TTL has rolled over (~24h post-deploy). */
  question?: string;
  options?: [string, string, string, string];
  correctIdx?: 0 | 1 | 2 | 3;
}

export interface DailyChallenge {
  dateKey: string;             // YYYY-MM-DD anchored to Asia/Jerusalem
  isToday: boolean;            // false if server fell back to yesterday's row
  isFallback: boolean;
  heroTitle: string;
  heroImageUrl: string | null;
  items: [ChallengeItem, ChallengeItem];
  sourcesUsed: Array<{ name: string; url: string; originalTitle: string }>;
}

/** Tracked locally — what the user did for each item today. */
export interface ItemAnswer {
  selectedIdx: number;
  wasCorrect: boolean;
  answeredAt: string;  // ISO
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}
