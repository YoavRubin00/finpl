import { getClientId, enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleTrade } from '../../../api/_shared/paperTrade';
import { createTradeDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/trading/trade  (Authorization: Bearer <session>)
 *
 * Body: { assetSymbol, assetName?, tradeType: 'BUY'|'SELL', quantity,
 *         priceAtExecution, cashDelta?, skipPortfolio? }
 * → 200 { ok: true, virtualBalance: "<numeric>" }
 * → 400 invalid input · 401 no / invalid session · 403 body authId names
 *   another user · 404 profile row missing · 429 rate limited
 *
 * Logic (auth, validation, the single-statement write) lives in
 * api/_shared/paperTrade.ts, shared with production (api/trading/trade.ts).
 * Fire-and-forget from the client (src/db/sync/syncPaperTrading.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'trading-trade', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handleTrade(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createTradeDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trading/trade POST');
  }
}
