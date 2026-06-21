/**
 * POST /api/voice/usage
 *
 * Lightweight backend acknowledgement for shark-voice session minutes.
 * The primary source of truth is the client-side useSubscriptionStore, this
 * endpoint exists for future server-side aggregation/analytics and to clamp
 * absurd values (e.g. a buggy client reporting 9999 seconds at once).
 *
 * Body: { seconds: number }
 * Response: { ok: true, seconds: number } — the clamped value the server accepted.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { clampNumber } from '../_shared/validate';

const MAX_REPORT_SECONDS = 45;

interface UsageBody {
  seconds?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'voice-usage', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as UsageBody;
    const seconds = clampNumber(body.seconds, 0, MAX_REPORT_SECONDS);
    if (seconds === undefined) {
      return Response.json({ error: 'Invalid seconds value.' }, { status: 400 });
    }
    return Response.json({ ok: true, seconds });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'voice/usage');
  }
}
