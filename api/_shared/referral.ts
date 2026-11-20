// api/_shared/referral.ts
//
// GET /api/referral/me, POST /api/referral/collect, POST /api/referral/redeem.
// (register-code lives in referralRegisterCode.ts.) Production
// (api/referral/*.ts) and the dev twin (app/api/referral/*+api.ts) both run
// these handlers; the Neon wiring is referralStores.ts and
// scripts/test-user-write-auth.ts runs them with in-memory fakes.
//
// Until 2026-11-20 all three acted on whatever account the request named
// (`?authId=` / body `authId` / body `refereeAuthId`), with no authentication:
//   me       returned any account's friends (their names and emails), its
//            invite code, and flipped its pending signup bonuses to "credited"
//            (so the real owner's app never added those coins);
//   collect  collected any account's daily dividend before its owner could;
//   redeem   redeemed an invite on behalf of any account (the attacker's own
//            code: +500 to the attacker, a forced friendship, and the victim's
//            one redemption used up), and answered with the referrer's email.
//
//   Session token (Authorization: Bearer, app builds after the 2026-11-20 OTA)
//       The account is the token's user, always. A body/query authId (sent by
//       older builds and, for collect/redeem, still sent for compatibility)
//       must name that same user or the call is refused with 403. A token
//       whose account no longer exists (deleted) gets 401.
//   No token (the 1.5.1 bundle sends none on these three calls)
//       Refused. No data is read and nothing moves. The answers are chosen so
//       the old app degrades gracefully until the OTA reaches it:
//         me       401 → the app keeps its saved friends list and numbers
//                  (fetchReferralState returns null on a non-2xx).
//         collect  401 → nothing is collected; the dividend stays collectable
//                  until the end of the UTC day for the updated app.
//         redeem   401 with code REFEREE_NOT_FOUND → the old app's one
//                  "retry next launch" code (anything else it treats as final
//                  and throws the pending invite away). The old app retries
//                  on at most 5 launches, then drops the invite, so the OTA
//                  must go out right after this server: a launch that runs
//                  the updated app redeems it with the token.
//       Each refusal logs one "[legacy-tokenless]" line (endpoint + outcome).

import {
  badRequest,
  invalidToken,
  isRecord,
  logLegacyCall,
  missingToken,
  resolveCaller,
  sanitizeText,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
  type LegacyLogger,
} from './callerAuth';

/** Magnitudes, mirrored client-side in src/features/social/referralConstants.ts. */
export const SIGNUP_BONUS_COINS = 500;
export const DIVIDEND_RATE = 0.05;
/** Daily cap 100 (מוני 8.7, approved by Yoav): a fifth of one portfolio-share reward. */
export const DIVIDEND_DAILY_CAP = 100;

export const INVITE_CODE_PATTERN = /^[A-Z0-9-]{4,12}$/;

/**
 * The code the 1.5.1 app maps to "transient, keep the pending invite and retry
 * on the next launch" (src/db/sync/syncReferral.ts FINAL_REDEEM_REASONS).
 * Sent with the tokenless 401 so those apps don't discard the invite.
 */
export const LEGACY_REDEEM_RETRY_CODE = 'REFEREE_NOT_FOUND';

export interface ReferralFriend {
  /** Opaque per-friend key (stable, not reversible). Sent as `authId`, the
   *  field name older apps read, which used to carry the friend's email. The
   *  app only uses it as a list key. */
  key: string;
  displayName: string | null;
  linkedAt: string;
  yesterdayLearningCoins: number;
}

export interface ReferralSnapshot {
  referralCode: string | null;
  friends: ReferralFriend[];
  alreadyCollectedToday: boolean;
  /** Referrals whose signup bonus the store just flipped to "credited". */
  newlyCreditedReferrals: number;
}

export type RedeemWrite = 'redeemed' | 'already_redeemed' | 'no_referee' | 'no_referrer';

export interface ReferralStore {
  /** The caller's referral state. Atomically flips referrer_local_credited on
   *  the caller's uncredited referrals (the response then carries those
   *  bonuses, which the app must add). null = no profile row. */
  snapshot(userId: string): Promise<ReferralSnapshot | null>;
  /** Sum of the referred friends' learning coins yesterday (UTC). null = no profile row. */
  friendsYesterdayLearningCoins(userId: string): Promise<number | null>;
  /** Record today's (UTC) collection; amount > 0 also writes the
   *  'referral-dividend' coin event in the same statement. 'already' when
   *  today's row exists. */
  recordDividend(userId: string, amount: number): Promise<'recorded' | 'already'>;
  findReferrerByCode(code: string): Promise<{ userId: string } | null>;
  /** One statement: referral row (one per referee, ever) + both signup bonuses. */
  redeem(refereeUserId: string, referrerUserId: string, code: string, bonus: number): Promise<RedeemWrite>;
  /** Best-effort accepted friendship between the two (skipped if any row exists). */
  befriend(referrerUserId: string, refereeUserId: string): Promise<void>;
}

export interface ReferralDeps extends CallerDeps {
  store: ReferralStore;
  now(): number;
  /** Server-side analytics (capturePostHog). distinctId is always a profile uuid. */
  capture(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void>;
  logLegacy?: LegacyLogger;
}

function utcDate(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function dividendFor(totalYesterdayLearningCoins: number): number {
  return Math.min(DIVIDEND_DAILY_CAP, Math.floor(Math.max(0, totalYesterdayLearningCoins) * DIVIDEND_RATE));
}

/** Body fields the handlers read (null/garbage bodies become {}). */
function bodyOf(input: CallerInput): Record<string, unknown> {
  return isRecord(input.body) ? input.body : {};
}

// ─── GET /api/referral/me ────────────────────────────────────────────────────

/** `queryAuthId`: the ?authId= the 1.5.1 app sends (checked like a body authId). */
export async function handleReferralMe(
  input: CallerInput & { queryAuthId?: string | null },
  deps: ReferralDeps,
): Promise<ApiResult> {
  const who = await resolveCaller(
    { authorization: input.authorization, body: { authId: input.queryAuthId ?? undefined }, clientIp: input.clientIp },
    deps,
  );
  if (!who.ok) return who.response;
  if (who.caller.kind === 'none') {
    (deps.logLegacy ?? logLegacyCall)('referral/me', 'refused');
    return missingToken();
  }

  const { userId, headers } = who.caller;
  const snap = await deps.store.snapshot(userId);
  if (!snap) return invalidToken(); // the account behind this session is gone

  const totalYesterdayLearningCoins = snap.friends.reduce((sum, f) => sum + f.yesterdayLearningCoins, 0);
  const dividend = dividendFor(totalYesterdayLearningCoins);
  return {
    status: 200,
    headers,
    body: {
      ok: true,
      friends: snap.friends.map((f) => ({
        authId: f.key,
        displayName: f.displayName,
        linkedAt: f.linkedAt,
        yesterdayLearningCoins: f.yesterdayLearningCoins,
      })),
      totalYesterdayLearningCoins,
      dividendAvailable: snap.alreadyCollectedToday ? 0 : dividend,
      alreadyCollectedToday: snap.alreadyCollectedToday,
      todayDateUTC: utcDate(deps.now()),
      pendingSignupBonus: snap.newlyCreditedReferrals * SIGNUP_BONUS_COINS,
      referralCode: snap.referralCode,
    },
  };
}

// ─── POST /api/referral/collect ──────────────────────────────────────────────

export async function handleReferralCollect(input: CallerInput, deps: ReferralDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;
  if (who.caller.kind === 'none') {
    (deps.logLegacy ?? logLegacyCall)('referral/collect', 'refused');
    return missingToken();
  }

  const { userId, headers } = who.caller;
  const total = await deps.store.friendsYesterdayLearningCoins(userId);
  if (total === null) return invalidToken();

  const amount = dividendFor(total);
  const write = await deps.store.recordDividend(userId, amount);
  if (write === 'already' || amount <= 0) {
    // amount 0 still records a 0 row ("checked today"), as before.
    return { status: 200, headers, body: { ok: true, amount: 0, alreadyCollected: true } };
  }
  return { status: 200, headers, body: { ok: true, amount, alreadyCollected: false } };
}

// ─── POST /api/referral/redeem ───────────────────────────────────────────────

function redeemError(status: number, error: string, code: string): ApiResult {
  return { status, body: { error, code } };
}

export async function handleReferralRedeem(input: CallerInput, deps: ReferralDeps): Promise<ApiResult> {
  const body = bodyOf(input);
  // The referee is named `refereeAuthId` (1.5.1 and the updated app, which
  // still sends it); checked against the token like any other body authId.
  const refereeAuthId = sanitizeText(body.refereeAuthId, 254) ?? sanitizeText(body.authId, 254);
  const who = await resolveCaller(
    { authorization: input.authorization, body: { authId: refereeAuthId }, clientIp: input.clientIp },
    deps,
  );
  if (!who.ok) return who.response;

  const inviteCode = sanitizeText(body.inviteCode, 12)?.toUpperCase();
  if (!inviteCode || !INVITE_CODE_PATTERN.test(inviteCode)) {
    return badRequest('Invalid invite code');
  }

  if (who.caller.kind === 'none') {
    (deps.logLegacy ?? logLegacyCall)('referral/redeem', 'refused');
    if (!refereeAuthId) return badRequest('Missing refereeAuthId');
    return {
      status: 401,
      body: { error: 'Missing Authorization header', code: LEGACY_REDEEM_RETRY_CODE, retryable: true },
    };
  }

  const { userId, headers } = who.caller;
  const event = 'referral_redeem_server';

  const referrer = await deps.store.findReferrerByCode(inviteCode);
  if (!referrer) {
    await deps.capture(event, userId, { result: 'code_not_found', invite_code: inviteCode, auth: 'session' });
    return { ...redeemError(404, 'Unknown invite code', 'CODE_NOT_FOUND'), headers };
  }
  if (referrer.userId === userId) {
    await deps.capture(event, userId, { result: 'self_referral', invite_code: inviteCode, auth: 'session' });
    return { ...redeemError(400, 'Cannot self-refer', 'SELF_REFERRAL'), headers };
  }

  const write = await deps.store.redeem(userId, referrer.userId, inviteCode, SIGNUP_BONUS_COINS);
  if (write === 'no_referee') return invalidToken(); // the account behind this session is gone
  if (write === 'no_referrer') {
    await deps.capture(event, userId, { result: 'code_not_found', invite_code: inviteCode, auth: 'session' });
    return { ...redeemError(404, 'Unknown invite code', 'CODE_NOT_FOUND'), headers };
  }
  if (write === 'already_redeemed') {
    await deps.capture(event, userId, { result: 'already_redeemed', invite_code: inviteCode, auth: 'session' });
    return { ...redeemError(409, 'Already redeemed an invite code', 'ALREADY_REDEEMED'), headers };
  }

  // Auto-friendship (Yoav 2026-07-08): the invite IS the friend request +
  // acceptance. Best-effort: a failure must never undo the paid bonuses.
  try {
    await deps.store.befriend(referrer.userId, userId);
  } catch { /* non-fatal */ }

  await deps.capture(event, userId, {
    result: 'success',
    invite_code: inviteCode,
    referrer_user_id: referrer.userId,
    bonus_granted: SIGNUP_BONUS_COINS,
    auth: 'session',
  });
  return {
    status: 200,
    headers,
    // `referrerAuthId` used to be the referrer's auth_id (their email), handed
    // to whoever redeemed their public invite code. No app reads it; the field
    // stays (empty) so the success shape is unchanged.
    body: { ok: true, referrerAuthId: '', bonusGranted: SIGNUP_BONUS_COINS },
  };
}
