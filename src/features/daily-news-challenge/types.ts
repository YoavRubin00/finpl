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
  /** Source attribution name (e.g. "Calcalist"). Shown under each item. */
  source: string;
  sourceUrl: string;
  /** Higgsfield-generated brand-styled image, or null → render gradient placeholder. */
  imageUrl: string | null;
  question: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  explanation: string;
  historicalExample: string;
  /** 1-paragraph briefing handed to the AI mentor when the user opens the chat overlay. */
  chatContext: string;
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
