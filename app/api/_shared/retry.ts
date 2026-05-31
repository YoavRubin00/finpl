/**
 * Generic retry helper with exponential backoff. Designed for transient
 * upstream failures (rate limits, brief outages, timeouts) on the LLM
 * vendor calls. Default: 3 attempts, 500ms → 1000ms → 2000ms.
 *
 * `shouldRetry` lets the caller filter which errors are retryable.
 * Returning false from it short-circuits the loop and re-throws — useful
 * for permanent errors like 401 Unauthorized (an invalid API key won't
 * heal between attempts).
 */
export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** Caller-provided filter — return false to stop retrying immediately. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Tag used in retry log messages. */
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseDelayMs = Math.max(50, opts.baseDelayMs ?? 500);
  const label = opts.label ?? 'task';

  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isFinal = i === attempts;
      const canRetry = opts.shouldRetry?.(err, i) ?? true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[retry] ${label} attempt ${i}/${attempts} failed: ${msg.slice(0, 200)}`);
      if (isFinal || !canRetry) break;
      const delay = baseDelayMs * Math.pow(2, i - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Heuristic — classify common LLM-provider errors as retryable.
 *  Auth failures (401/403) and not-found (404) are permanent. Rate limits
 *  (429), gateway timeouts (5xx), and network errors are transient. */
export function isTransientAiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Auth / not-found → permanent
  if (/\b(401|403|404)\b/.test(msg)) return false;
  if (/unauthor|forbidden|api[_ ]?key.*invalid|invalid[_ ]?api[_ ]?key/i.test(msg)) return false;
  // Otherwise treat as transient (429, 5xx, network, JSON parse on partial data)
  return true;
}
