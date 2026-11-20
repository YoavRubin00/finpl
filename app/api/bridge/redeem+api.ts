import { getClientId, enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleBridgeRedeem } from '../../../api/_shared/bridgeRedeem';
import { createBridgeRedeemDeps } from '../../../api/_shared/economyStores';

/**
 * POST /api/bridge/redeem  (Authorization: Bearer <session>)
 *
 * Body: { benefitId, platform? }
 * → 200 { ok, redeemed: true, alreadyRedeemed, benefitId, costCoins, partnerUrl, economy }
 * → 409 INSUFFICIENT_COINS (with economy) · 404 UNKNOWN_BENEFIT / no profile
 * → 401 no / invalid session · 403 body authId names another user
 * → 503 REDEEM_UNAVAILABLE (migration 0018 not applied) · 429 rate limited
 *
 * The server checks its own balance and deducts atomically, once per user and
 * benefit (api/_shared/bridgeRedeem.ts), shared with production
 * (api/bridge/redeem.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bridge-redeem', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handleBridgeRedeem(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createBridgeRedeemDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bridge/redeem POST');
  }
}
