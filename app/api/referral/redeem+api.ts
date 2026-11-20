import { enforceRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleReferralRedeem } from '../../../api/_shared/referral';
import { createReferralDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/referral/redeem  (Authorization: Bearer <session>)
 *
 * Body: { inviteCode, refereeAuthId? }
 * The referee is the token's user. One statement links the referee to the
 * code's owner (one redemption per account, ever) and grants 500 coins to
 * each; then an accepted friendship between the two (best-effort).
 *
 * → 200 { ok: true, referrerAuthId: '', bonusGranted }
 * → 400 { code: 'SELF_REFERRAL' } / invalid code · 404 { code: 'CODE_NOT_FOUND' }
 * → 409 { code: 'ALREADY_REDEEMED' }
 * → 401 invalid session / the account no longer exists; no session at all:
 *       401 { code: 'REFEREE_NOT_FOUND', retryable: true } (keeps the 1.5.1
 *       app's pending invite for a retry after the OTA, see referral.ts)
 * → 403 refereeAuthId names another user · 429 rate limited
 *
 * Logic in api/_shared/referral.ts, shared with production (api/referral/redeem.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-redeem', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid invite code' }, { status: 400 });
  }

  try {
    const result = await handleReferralRedeem(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createReferralDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/redeem POST');
  }
}
