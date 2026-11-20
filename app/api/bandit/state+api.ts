import { getDb } from '../../../api/_shared/db';
import { BANDIT_STATE_CDN_CACHE, loadBanditState } from '../../../api/_shared/bandit';
import { CDN_CACHE_HEADER } from '../../../api/_shared/cdnCache';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

export type { BanditServerVariant } from '../../../api/_shared/bandit';

/** GET /api/bandit/state — returns global alpha/beta for all variants, grouped by experiment.
 *  Logic lives in api/_shared/bandit.ts (shared with the production api/ tree). */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bandit-state-get', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const experiments = await loadBanditState(getDb());
    return Response.json(
      { ok: true, experiments },
      { headers: { [CDN_CACHE_HEADER]: BANDIT_STATE_CDN_CACHE } },
    );
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bandit/state GET');
  }
}
