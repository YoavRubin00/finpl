import { getDb } from '../../../api/_shared/db';
import { CQ_ISO_DATE_RE, CQ_QUESTION_ID_RE, getCrowdCounts } from '../../../api/_shared/crowdQuestion';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

/** GET /api/crowd-question/stats?questionId=X&voteDateIL=YYYY-MM-DD
 *  Counting lives in api/_shared/crowdQuestion.ts (shared with api/). */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-question-stats', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const questionId = sanitizeString(url.searchParams.get('questionId'), 80);
    const voteDateIL = sanitizeString(url.searchParams.get('voteDateIL'), 10);

    if (!questionId || !voteDateIL) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    if (!CQ_QUESTION_ID_RE.test(questionId)) {
      return Response.json({ error: 'Invalid questionId' }, { status: 400 });
    }
    if (!CQ_ISO_DATE_RE.test(voteDateIL)) {
      return Response.json({ error: 'Invalid voteDateIL' }, { status: 400 });
    }

    const { countA, countB, total } = await getCrowdCounts(getDb(), questionId, voteDateIL);
    return Response.json({ ok: true, countA, countB, total });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-question/stats GET');
  }
}
