import { enforceRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleReferralMe } from '../../../api/_shared/referral';
import { createReferralDeps } from '../../../api/_shared/userWriteStores';

/**
 * GET /api/referral/me  (Authorization: Bearer <session>)
 *
 * The caller's referred friends (display name, link date, yesterday's
 * learning coins), today's dividend, the signup bonuses to add locally
 * (`pendingSignupBonus`, flipped to "credited" in the same call: the app MUST
 * addCoins it) and the caller's canonical invite code.
 *
 * → 200 { ok, friends, totalYesterdayLearningCoins, dividendAvailable,
 *         alreadyCollectedToday, todayDateUTC, pendingSignupBonus, referralCode }
 * → 401 no session / invalid session / the account no longer exists
 * → 403 ?authId= names another user · 429 rate limited
 *
 * `friends[].authId` is an opaque key (it used to be the friend's email).
 * Logic in api/_shared/referral.ts, shared with production (api/referral/me.ts).
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-me', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const result = await handleReferralMe(
      {
        authorization: request.headers.get('authorization'),
        body: null,
        clientIp: getClientId(request),
        queryAuthId: url.searchParams.get('authId'),
      },
      createReferralDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/me GET');
  }
}
