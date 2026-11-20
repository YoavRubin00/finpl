import { getDb } from '../../../api/_shared/db';
import { parseBanditEvent, recordBanditEvent } from '../../../api/_shared/bandit';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';

/** POST /api/bandit/event — anonymously records one bandit event globally.
 *  Logic lives in api/_shared/bandit.ts (shared with the production api/ tree). */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bandit-event-post', { limit: 100, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const parsed = parseBanditEvent(await request.json());
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    await recordBanditEvent(getDb(), parsed.experimentId, parsed.variantId, parsed.event);

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bandit/event POST');
  }
}
