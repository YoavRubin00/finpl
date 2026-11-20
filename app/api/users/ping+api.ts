import { getClientId, enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handlePing } from '../../../api/_shared/userPing';
import { createPingDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/users/ping  (Authorization: Bearer <session>)
 *
 * Body: { authId? }  — optional; when sent it must name the signed-in user.
 * → 200 { ok: true, date: 'YYYY-MM-DD' }  (Israel calendar day)
 * → 401 no / invalid session · 403 body authId names another user · 429
 *
 * Marks the signed-in user active today and advances the streak exactly like
 * /api/sync/streak. Logic in api/_shared/userPing.ts, shared with production
 * (api/users/ping.ts). Fire-and-forget from the client (syncUserActive.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'users-ping', { limit: 120, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handlePing(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createPingDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'users/ping POST');
  }
}
