import { enforceRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { handleAccountDelete } from '../../../api/_shared/accountDelete';
import { createAccountDeleteDeps } from '../../../api/_shared/accountDeleteStore';

/**
 * POST /api/account/delete  (Authorization: Bearer <session>)
 *
 * Body: { confirm: 'DELETE_MY_ACCOUNT' }
 * Deletes the signed-in user's account and data in one transaction.
 * → 200 { ok: true, deleted: true } · 200 { ok: true, deleted: false, alreadyDeleted: true }
 * → 400 CONFIRM_REQUIRED · 401 · 403 · 429 · 500 (nothing deleted)
 *
 * Logic in api/_shared/accountDelete.ts (+ accountDeleteStore.ts for the
 * table-by-table plan), shared with production (api/account/delete.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'account-delete', { limit: 5, windowSec: 60 });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Missing deletion confirmation', code: 'CONFIRM_REQUIRED' }, { status: 400 });
  }

  try {
    const result = await handleAccountDelete(
      { authorization: request.headers.get('authorization'), body, clientIp: getClientId(request) },
      createAccountDeleteDeps(),
    );
    return json(result.body, { status: result.status, headers: result.headers });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'account/delete POST');
  }
}
