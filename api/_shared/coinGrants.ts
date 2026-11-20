// api/_shared/coinGrants.ts
//
// POST /api/economy/grant-coins — appends one coin_events row. TELEMETRY: the
// user's real balance lives in user_profiles.coins (written by
// /api/sync/economy); coin_events only feeds the referral dividend
// (/api/referral/collect pays a referrer min(100, 5% of the referees' previous
// day lesson/quiz/daily-quest events)) and the friend stats in /api/referral/me.
//
// Until 2026-11-20 this inserted a row for whatever `authId` the body named,
// with no authentication and amounts up to 100,000 per call. Now:
//
//   Session token (app builds after the 2026-11-20 OTA)
//       Row goes to the token's user. Per-source caps: amount clamped to
//       maxPerEvent, and nothing is recorded once the user's rolling-24h total
//       for that source would pass maxPerDay (429 DAILY_CAP).
//   No token (today's 1.5.1 bundle never sends one on this call)
//       Transitional legacy path, kept only so referrers' dividends don't drop
//       while the OTA rolls out. Remove it once "[legacy-tokenless]
//       economy/grant-coins" log lines stop (set ALLOW_LEGACY_TOKENLESS_GRANTS
//       to false, or delete the branch). Limits: dividend sources only, at most
//       LEGACY_GRANT_LIMITS.maxPerEvent per call, at most
//       maxPerDayAllSources per user per rolling 24h across all dividend
//       sources (= exactly the 100-coin daily dividend cap at 5%), durable
//       per-IP and per-authId request limits, and the answer never reveals
//       whether the authId exists or the row was recorded.

import {
  badRequest,
  checkDurableLimits,
  isRecord,
  logLegacyCall,
  missingToken,
  readBodyAuthId,
  resolveCaller,
  sanitizeText,
  tooManyRequests,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
  type LegacyLogger,
} from './callerAuth';
import type { RateLimitStore } from './authStores';

/** Flip to false to close the tokenless path (see header). */
export const ALLOW_LEGACY_TOKENLESS_GRANTS = true;

/** Sources accepted from clients. Server-only sources (`referral-*`) are
 *  inserted directly by the referral endpoints and rejected here so a client
 *  can't forge referral telemetry. */
export const COIN_GRANT_LIMITS = {
  lesson: { maxPerEvent: 2_000, maxPerDay: 20_000 },
  quiz: { maxPerEvent: 1_000, maxPerDay: 10_000 },
  'daily-quest': { maxPerEvent: 1_000, maxPerDay: 10_000 },
  'signup-bonus': { maxPerEvent: 1_000, maxPerDay: 1_000 },
} as const;

export type GrantSource = keyof typeof COIN_GRANT_LIMITS;

/** The sources /api/referral/collect pays a dividend on. */
export const DIVIDEND_SOURCES: readonly GrantSource[] = ['lesson', 'quiz', 'daily-quest'];

export const LEGACY_GRANT_LIMITS = {
  maxPerEvent: 500,
  /** 2,000 × 5% = 100 = the existing daily dividend cap. */
  maxPerDayAllSources: 2_000,
  /** Generous: Israeli mobile carriers put many users behind one CGNAT IP.
   *  The per-user amount cap above is what bounds the effect. */
  perIp: { max: 1_000, windowSec: 60 * 60 },
  perAuthId: { max: 120, windowSec: 60 * 60 },
} as const;

export type GrantTarget = { userId: string } | { authId: string };

export type GrantInsertResult = 'inserted' | 'capped' | 'no_user';

export interface CoinGrantStore {
  /**
   * Insert one coin_events row for the target user unless the user's
   * coin_events total over the last 24 hours, for `capSources`, plus `amount`
   * would exceed `maxPerDay`. One statement; concurrent calls can overshoot
   * by at most one event each.
   */
  insertWithinDailyCap(
    target: GrantTarget,
    amount: number,
    source: GrantSource,
    capSources: readonly GrantSource[],
    maxPerDay: number,
  ): Promise<GrantInsertResult>;
}

export interface CoinGrantDeps extends CallerDeps {
  store: CoinGrantStore;
  rateLimits: RateLimitStore;
  now(): number;
  logLegacy?: LegacyLogger;
}

function isGrantSource(s: string | undefined): s is GrantSource {
  return !!s && Object.prototype.hasOwnProperty.call(COIN_GRANT_LIMITS, s);
}

export async function handleGrantCoins(input: CallerInput, deps: CoinGrantDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;

  const body = isRecord(input.body) ? input.body : {};
  const source = sanitizeText(body.source, 32);
  if (!isGrantSource(source)) return badRequest('Invalid source');
  const rawAmount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? Math.round(body.amount) : NaN;
  if (!(rawAmount >= 1)) return badRequest('Invalid amount');

  if (who.caller.kind === 'session') {
    const limits = COIN_GRANT_LIMITS[source];
    const amount = Math.min(rawAmount, limits.maxPerEvent);
    const result = await deps.store.insertWithinDailyCap(
      { userId: who.caller.userId },
      amount,
      source,
      [source],
      limits.maxPerDay,
    );
    if (result === 'capped') {
      return {
        status: 429,
        body: { error: 'Daily coin-grant limit reached', code: 'DAILY_CAP' },
        headers: who.caller.headers,
      };
    }
    return { status: 200, body: { ok: true }, headers: who.caller.headers };
  }

  // ── Legacy: no Authorization header ──
  const log = deps.logLegacy ?? logLegacyCall;
  const authId = readBodyAuthId(body);
  if (!authId) return badRequest('Missing authId');
  if (!ALLOW_LEGACY_TOKENLESS_GRANTS || !DIVIDEND_SOURCES.includes(source)) {
    log('economy/grant-coins', 'refused');
    return missingToken();
  }

  const limited = await checkDurableLimits(deps.rateLimits, [
    { scope: 'grant-legacy-ip', value: input.clientIp, ...LEGACY_GRANT_LIMITS.perIp },
    { scope: 'grant-legacy-auth', value: authId.toLowerCase(), ...LEGACY_GRANT_LIMITS.perAuthId },
  ], deps.now());
  if (limited.limited) {
    log('economy/grant-coins', 'rate_limited');
    return tooManyRequests(limited.retryAfterSec);
  }

  const amount = Math.min(rawAmount, LEGACY_GRANT_LIMITS.maxPerEvent);
  const result = await deps.store.insertWithinDailyCap(
    { authId },
    amount,
    source,
    DIVIDEND_SOURCES,
    LEGACY_GRANT_LIMITS.maxPerDayAllSources,
  );
  log('economy/grant-coins', result === 'inserted' ? 'accepted' : 'not_recorded');
  // Same answer whether or not a row was written: no account-existence oracle.
  return { status: 200, body: { ok: true } };
}
