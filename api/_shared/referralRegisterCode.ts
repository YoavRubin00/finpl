// api/_shared/referralRegisterCode.ts
//
// POST /api/referral/register-code — store the user's personal invite code so
// a friend's redeem can find the referrer. Idempotent. Guarded UPDATE: a row
// that already holds a DIFFERENT code keeps it; the UNIQUE index on
// user_profiles.referral_code turns "someone else has this code" into 409.
// Answers { ok: true, canonicalCode } — the client adopts canonicalCode when it
// differs from its local code (stale-QR self-heal).
//
// Until 2026-11-20 this acted on whatever `authId` the body named, with no
// authentication: anyone could set a code on an account without one, and read
// back any account's code (and whether an email has an account at all).
//
//   Session token (app builds after the 2026-11-20 OTA)
//       Acts on the token's user; full answer, as before.
//   No token (today's 1.5.1 bundle never sends one on this call)
//       Transitional legacy path, kept because a code that isn't registered
//       makes every invite the user shares die with CODE_NOT_FOUND. Limits:
//       it can only set a code on an account that has NONE (or confirm the
//       same code), durable per-IP and per-authId request limits, and
//       canonicalCode is only ever the code the caller itself sent (or null)
//       — it never reveals another account's code or existence. The client
//       answers null with "retry next launch", and /api/referral/me still
//       self-heals the code. Remove once "[legacy-tokenless]
//       referral/register-code" log lines stop (ALLOW_LEGACY_TOKENLESS_REGISTER).

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
import type { GrantTarget } from './coinGrants';

/** Flip to false to close the tokenless path (see header). */
export const ALLOW_LEGACY_TOKENLESS_REGISTER = true;

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{4,12}$/;

export const LEGACY_REGISTER_LIMITS = {
  perIp: { max: 120, windowSec: 60 * 60 },
  perAuthId: { max: 20, windowSec: 24 * 60 * 60 },
} as const;

export interface ReferralCodeRow {
  userId: string;
  code: string | null;
}

export interface ReferralCodeStore {
  /** Guarded set (only when the row has no code or this same code). The row
   *  after the update; null when the guard didn't match or there is no row;
   *  'collision' when another account already holds the code. */
  claim(target: GrantTarget, code: string): Promise<ReferralCodeRow | null | 'collision'>;
  /** The row's current code (null row = no such account). */
  current(target: GrantTarget): Promise<ReferralCodeRow | null>;
}

export interface RegisterCodeDeps extends CallerDeps {
  store: ReferralCodeStore;
  rateLimits: RateLimitStore;
  now(): number;
  /** Server-side analytics (capturePostHog). distinctId is always a profile uuid. */
  capture(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void>;
  logLegacy?: LegacyLogger;
}

const EVENT = 'referral_register_code_server';

function collision(): ApiResult {
  return { status: 409, body: { error: 'Code collision — regenerate', code: 'COLLISION' } };
}

export async function handleRegisterCode(input: CallerInput, deps: RegisterCodeDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;

  const body = isRecord(input.body) ? input.body : {};
  // Same parsing as before (sanitize to 12, then the pattern).
  const referralCode = sanitizeText(body.referralCode, 12);

  if (who.caller.kind === 'session') {
    if (!referralCode || !REFERRAL_CODE_PATTERN.test(referralCode)) return badRequest('Invalid referral code format');
    const { userId, headers } = who.caller;
    const target = { userId };

    const claimed = await deps.store.claim(target, referralCode);
    if (claimed === 'collision') {
      await deps.capture(EVENT, userId, { result: 'collision', requested_code: referralCode, auth: 'session' });
      return { ...collision(), headers };
    }

    let canonicalCode: string | null;
    let result: 'registered' | 'kept_existing' | 'no_profile';
    if (claimed) {
      canonicalCode = claimed.code;
      result = 'registered';
    } else {
      const existing = await deps.store.current(target);
      canonicalCode = existing?.code ?? null;
      result = existing ? 'kept_existing' : 'no_profile';
    }
    await deps.capture(EVENT, userId, {
      result,
      requested_code: referralCode,
      canonical_code: canonicalCode,
      auth: 'session',
    });
    return { status: 200, body: { ok: true, canonicalCode }, headers };
  }

  // ── Legacy: no Authorization header ──
  const log = deps.logLegacy ?? logLegacyCall;
  const authId = readBodyAuthId(body);
  if (!authId) return badRequest('Missing authId');
  if (!referralCode || !REFERRAL_CODE_PATTERN.test(referralCode)) return badRequest('Invalid referral code format');
  if (!ALLOW_LEGACY_TOKENLESS_REGISTER) {
    log('referral/register-code', 'refused');
    return missingToken();
  }

  const limited = await checkDurableLimits(deps.rateLimits, [
    { scope: 'refcode-legacy-ip', value: input.clientIp, ...LEGACY_REGISTER_LIMITS.perIp },
    { scope: 'refcode-legacy-auth', value: authId.toLowerCase(), ...LEGACY_REGISTER_LIMITS.perAuthId },
  ], deps.now());
  if (limited.limited) {
    log('referral/register-code', 'rate_limited');
    return tooManyRequests(limited.retryAfterSec);
  }

  const target = { authId };
  const claimed = await deps.store.claim(target, referralCode);
  if (claimed === 'collision') {
    log('referral/register-code', 'collision');
    return collision();
  }
  if (claimed) {
    log('referral/register-code', 'accepted');
    await deps.capture(EVENT, claimed.userId, {
      result: 'registered',
      requested_code: referralCode,
      canonical_code: claimed.code,
      auth: 'legacy',
    });
    return { status: 200, body: { ok: true, canonicalCode: claimed.code } };
  }

  // Not registered: the account holds another code, or doesn't exist. Answer
  // the same in both cases and never hand out the stored code.
  log('referral/register-code', 'not_recorded');
  const existing = await deps.store.current(target);
  if (existing) {
    await deps.capture(EVENT, existing.userId, {
      result: 'kept_existing',
      requested_code: referralCode,
      auth: 'legacy',
    });
  }
  return { status: 200, body: { ok: true, canonicalCode: null } };
}
