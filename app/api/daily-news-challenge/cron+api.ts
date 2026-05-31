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
  const startedAt = Date.now();
  const auth = request.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';

    const result = await generateTodaysChallenge({ force });
    const tookMs = Date.now() - startedAt;
    console.log(
      `[dnc/cron] OK dateKey=${result.dateKey} cached=${result.cached} ` +
      `itemCount=${result.payload.items.length} tookMs=${tookMs} ` +
      `heroTitle=${JSON.stringify(result.payload.heroTitle.slice(0, 60))}`,
    );
    return Response.json({
      ok: true,
      dateKey: result.dateKey,
      cached: result.cached,
      heroTitle: result.payload.heroTitle,
      itemCount: result.payload.items.length,
      tookMs,
    });
  } catch (err) {
    // Surface the full error inline (NOT via safeErrorResponse) so the
    // Vercel cron log shows what actually broke — this endpoint is only
    // callable with the cron secret, so leaking detail is safe. Previously
    // the cron failed silently behind a "Internal server error" generic
    // and we only noticed when users saw stale content the next day.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const tookMs = Date.now() - startedAt;
    console.error(
      `[dnc/cron] FAILED tookMs=${tookMs} message=${JSON.stringify(message)} ` +
      `stack=${stack ?? 'n/a'}`,
    );
    return Response.json(
      {
        ok: false,
        error: 'cron generation failed',
        detail: message.slice(0, 400),
        tookMs,
      },
      { status: 500 },
    );
  }
}
