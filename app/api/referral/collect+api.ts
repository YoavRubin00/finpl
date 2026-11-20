import { enforceRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleReferralCollect } from '../../../api/_shared/referral';
import { createReferralDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/referral/collect  (Authorization: Bearer <session>)
 *
 * Body: { authId? }
 * Collects today's dividend: 5% of the referred friends' learning coins from
 * yesterday (UTC), capped at 100, once per UTC day (PK on dividend_collections),
 * written with a 'referral-dividend' coin event.
 *
 * → 200 { ok: true, amount, alreadyCollected: false }   collected now
 * → 200 { ok: true, amount: 0, alreadyCollected: true }  already today / nothing to collect
 * → 401 no session / invalid session / the account no longer exists
 * → 403 body authId names another user · 429 rate limited
 *
 * Logic in api/_shared/referral.ts, shared with production (api/referral/collect.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-collect', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  try {
    const result = await handleReferralCollect(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createReferralDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/collect POST');
  }
}
