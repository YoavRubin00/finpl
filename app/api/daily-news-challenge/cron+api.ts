/**
 * GET /api/daily-news-challenge/cron
 *
 * Vercel cron at 04:00 UTC daily (07:00 IL). Generates today's challenge
 * (1 row in `daily_news_challenge`) via Tavily → Gemini Flash 2.5.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Idempotent: a second run on the same date is a cache hit (UNIQUE on
 * date_key). Pass `?force=1` to overwrite.
 */

import { safeErrorResponse } from '../_shared/safeError';
import { generateTodaysChallenge } from './_lib';

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';

    const result = await generateTodaysChallenge({ force });
    return Response.json({
      ok: true,
      dateKey: result.dateKey,
      cached: result.cached,
      heroTitle: result.payload.heroTitle,
      itemCount: result.payload.items.length,
    });
  } catch (err) {
    return safeErrorResponse(err, 'daily-news-challenge/cron');
  }
}
