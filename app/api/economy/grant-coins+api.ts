import { getClientId, enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleGrantCoins } from '../../../api/_shared/coinGrants';
import { createCoinGrantDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/economy/grant-coins  (Authorization: Bearer <session>)
 *
 * Body: { amount, source, authId? }
 * → 200 { ok: true }
 * → 400 invalid input · 401 invalid session · 403 body authId names another
 *   user · 429 rate limited / DAILY_CAP
 *
 * Appends one coin_events row (referral-dividend TELEMETRY; the user's balance
 * is /api/sync/economy's job). Per-source caps for signed-in callers and a
 * narrow, rate-limited tokenless path for app bundles that predate the token
 * — see api/_shared/coinGrants.ts, shared with production
 * (api/economy/grant-coins.ts). Fire-and-forget from the client.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'economy-grant-coins', { limit: 120, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handleGrantCoins(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createCoinGrantDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'economy/grant-coins POST');
  }
}
