/**
 * In-memory rate limiter for Vercel Serverless functions.
 * Each function instance has its own window — this is best-effort,
 * not global. For strict limiting, swap to Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60_000);

interface RateLimitOptions {
  /** Max requests in the window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Returns whether the request is allowed under the rate limit.
 * `key` should be something like `ip:endpoint` or `authId:endpoint`.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + opts.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > opts.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract a best-effort client identifier from a Request.
 * Checks x-forwarded-for (Vercel provides this), then falls back to a generic key.
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown-client';
}

/**
 * Returns a 429 Response if rate limit is exceeded.
 * Returns null if allowed — caller should continue normally.
 */
export function enforceRateLimit(
  request: Request,
  endpoint: string,
  opts: RateLimitOptions,
): Response | null {
  const clientId = getClientId(request);
  const key = `${clientId}:${endpoint}`;
  const result = checkRateLimit(key, opts);

  if (!result.allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }
  return null;
}
