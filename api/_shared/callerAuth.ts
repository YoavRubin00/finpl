// api/_shared/callerAuth.ts
//
// "Who is calling?" for the write endpoints that used to act on whatever
// `authId` the request body named (users/ping, economy/grant-coins,
// referral/register-code) and for trading/trade. Before 2026-11-20 anyone who
// knew a user's id (= their email) could act as that user.
//
//   Authorization: Bearer <session JWT>
//       The acting user is the token's user (`sub`), always. A body `authId`
//       is optional; when sent it must name that same user, or the call is
//       refused with 403. "Same user" = the token's authId or the profile's
//       email, compared case-insensitively, because app builds up to 1.5.1
//       send the profile EMAIL as `authId`, and for older Apple accounts
//       auth_id is the Apple subject, not the email.
//   Authorization header present but not a valid session (garbage, expired,
//   wrong secret)
//       401 with the same body withAuth.ts uses. Never falls back to the body.
//   No Authorization header at all
//       { kind: 'none' }. Each endpoint decides: ping and trade refuse;
//       grant-coins and register-code keep a narrow, rate-limited legacy path
//       for app bundles that predate the token (see logLegacyCall).
//
// No database access here except the optional email lookup (injected), so
// scripts/test-user-write-auth.ts runs this with in-memory fakes.

import { shouldRefresh, signSession, verifySession } from './jwt';
import { throttleKey, type RateLimitStore } from './authStores';

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface CallerInput {
  /** Raw Authorization header value (null when absent). */
  authorization: string | null;
  /** Parsed JSON body (anything; validated by each endpoint). */
  body: unknown;
  /** Best-effort client IP (x-forwarded-for), only used for throttle keys. */
  clientIp: string;
}

export interface SessionCaller {
  kind: 'session';
  /** user_profiles.id from the token. */
  userId: string;
  /** user_profiles.auth_id from the token. */
  authId: string;
  /** X-Auth-Refreshed-Token when the session is inside its refresh window (as withAuth does). */
  headers: Record<string, string>;
}

export type Caller = SessionCaller | { kind: 'none' };

export type CallerOutcome = { ok: true; caller: Caller } | { ok: false; response: ApiResult };

export interface CallerDeps {
  /** user_profiles.email for a user id (null when the row or the email is missing). */
  profileEmail(userId: string): Promise<string | null>;
}

export type LegacyOutcome = 'accepted' | 'not_recorded' | 'refused' | 'rate_limited' | 'collision';
export type LegacyLogger = (endpoint: string, outcome: LegacyOutcome) => void;

export function missingToken(): ApiResult {
  return { status: 401, body: { error: 'Missing Authorization header' } };
}

export function invalidToken(): ApiResult {
  return { status: 401, body: { error: 'Invalid or expired token' } };
}

export function authIdMismatch(): ApiResult {
  return { status: 403, body: { error: 'authId does not match the signed-in user', code: 'AUTH_ID_MISMATCH' } };
}

export function badRequest(error: string): ApiResult {
  return { status: 400, body: { error } };
}

export function tooManyRequests(retryAfterSec: number): ApiResult {
  const sec = Math.max(1, Math.ceil(retryAfterSec));
  return {
    status: 429,
    body: { error: 'Too many requests. Please try again later.' },
    headers: { 'Retry-After': String(sec) },
  };
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Same rules as app/api/_shared/validate.ts sanitizeString: strip control
 *  characters (keeping \t \n \r), trim, cut to maxLength; empty → undefined. */
export function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

/** The body's `authId` (what clients up to 1.5.1 send: the profile email). */
export function readBodyAuthId(body: unknown): string | undefined {
  return isRecord(body) ? sanitizeText(body.authId, 254) : undefined;
}

function sameIdentity(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function resolveCaller(input: CallerInput, deps: CallerDeps): Promise<CallerOutcome> {
  const header = (input.authorization ?? '').trim();
  if (!header) return { ok: true, caller: { kind: 'none' } };

  // A header that is there but unusable is an invalid session, never "no token":
  // otherwise `Authorization: garbage` would open the legacy path.
  const match = /^Bearer\s+(\S+)$/.exec(header);
  if (!match) return { ok: false, response: invalidToken() };

  let decoded;
  try {
    decoded = verifySession(match[1]);
  } catch {
    return { ok: false, response: invalidToken() };
  }

  const bodyAuthId = readBodyAuthId(input.body);
  if (bodyAuthId && !sameIdentity(bodyAuthId, decoded.authId)) {
    const email = await deps.profileEmail(decoded.sub);
    if (!email || !sameIdentity(bodyAuthId, email)) {
      return { ok: false, response: authIdMismatch() };
    }
  }

  const headers: Record<string, string> = {};
  if (shouldRefresh(decoded)) {
    headers['X-Auth-Refreshed-Token'] = signSession({ sub: decoded.sub, authId: decoded.authId });
  }
  return { ok: true, caller: { kind: 'session', userId: decoded.sub, authId: decoded.authId, headers } };
}

/**
 * One structured line per tokenless call, so the legacy path's decline after
 * the OTA can be watched in the Vercel logs (filter on "[legacy-tokenless]").
 * Endpoint name and outcome only — never an IP, email or user id.
 */
export const logLegacyCall: LegacyLogger = (endpoint, outcome) => {
  console.info(`[legacy-tokenless] ${JSON.stringify({ endpoint, outcome })}`);
};

export interface DurableLimit {
  scope: string;
  value: string;
  max: number;
  windowSec: number;
}

/**
 * Counts one hit on each limit in auth_rate_limits (shared by every instance).
 * Returns the longest wait when any limit is exceeded.
 *
 * Fails OPEN when the store errors (e.g. table missing): these limits only
 * guard the transitional legacy path, whose effects are already capped per
 * user in SQL, and failing closed would break today's app bundle.
 */
export async function checkDurableLimits(
  store: RateLimitStore,
  limits: DurableLimit[],
  nowMs: number,
): Promise<{ limited: false } | { limited: true; retryAfterSec: number }> {
  let hits: Array<{ count: number; resetAtMs: number }>;
  try {
    hits = await Promise.all(limits.map((l) => store.hit(throttleKey(l.scope, l.value), l.windowSec, nowMs)));
  } catch (err) {
    console.warn(`[legacy-tokenless] durable limiter unavailable: ${err instanceof Error ? err.message : String(err)}`);
    return { limited: false };
  }
  let limited = false;
  let retryAfterSec = 1;
  hits.forEach((hit, i) => {
    if (hit.count > limits[i].max) {
      limited = true;
      retryAfterSec = Math.max(retryAfterSec, (hit.resetAtMs - nowMs) / 1000);
    }
  });
  return limited ? { limited: true, retryAfterSec } : { limited: false };
}
