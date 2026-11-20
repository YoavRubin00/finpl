import { getClientId, enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleRegisterCode } from '../../../api/_shared/referralRegisterCode';
import { createRegisterCodeDeps } from '../../../api/_shared/userWriteStores';

/**
 * POST /api/referral/register-code  (Authorization: Bearer <session>)
 *
 * Body: { referralCode, authId? }
 * → 200 { ok: true, canonicalCode }   the code the DB holds for the caller;
 *                                    the client adopts it when it differs
 * → 409 { code: 'COLLISION' }         another account holds this code — regenerate
 * → 400 invalid input · 401 invalid session · 403 body authId names another
 *   user · 429 rate limited
 *
 * Idempotent. Logic in api/_shared/referralRegisterCode.ts, shared with
 * production (api/referral/register-code.ts), including the narrow tokenless
 * path kept for app bundles that predate the token.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-register-code', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await handleRegisterCode(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createRegisterCodeDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/register-code POST');
  }
}
