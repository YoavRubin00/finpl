/**
 * Abort signal for outbound fetches so a hung upstream (AI provider, image
 * store, market data) cannot hold a function open until maxDuration (120s).
 *
 * The cast is the same one used elsewhere in api/: Expo's ambient fetch types
 * and undici's declare AbortSignal separately, but at runtime (Node) they are
 * the same object.
 */
export function timeoutSignal(ms: number): NonNullable<RequestInit['signal']> {
  return AbortSignal.timeout(ms) as unknown as NonNullable<RequestInit['signal']>;
}

/** Outbound timeout budgets (ms). Generous on purpose: they only exist to cut
 *  off a hung connection, never a slow-but-healthy answer. */
export const TIMEOUTS = {
  /** Short Gemini answers (≤ ~1k output tokens, thinking off). */
  aiShort: 30_000,
  /** Longer Gemini generations (reports, insights). */
  aiLong: 60_000,
  /** One attempt inside withRetry (3 attempts + backoff must fit in 120s). */
  aiRetried: 35_000,
  /** Streaming: time allowed until the first response headers arrive. */
  aiStreamHeaders: 20_000,
  /** Search / news APIs (Perplexity, Tavily). */
  search: 20_000,
  /** Market data, image store, token mints. */
  quick: 10_000,
} as const;
