/**
 * GET /api/breaking-news/cron
 *
 * Triggered by Vercel cron at 06:00 UTC daily (≈ 09:00 IST). For every
 * distinct ticker that any user is tracking, runs the Tavily→Gemini→Neon
 * pipeline once if today's summary isn't already cached.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — Vercel cron jobs are
 * invoked with this header automatically when configured via
 * `vercel.json` + the `CRON_SECRET` env var. Manual hits from the team
 * need the same header.
 *
 * Idempotent: a second run on the same day is fully a no-op because every
 * ticker hits the `(ticker, trading_day)` UNIQUE constraint check first.
 *
 * One bad ticker doesn't poison the rest — `Promise.allSettled` collects
 * per-ticker results and the response body reports the breakdown.
 */

import { sql } from 'drizzle-orm';
import { breakingNewsTracked } from '../../../src/db/schema';
import { safeErrorResponse } from '../_shared/safeError';
import { generateForTicker, getDb } from './_lib';

interface PerTickerResult {
  ticker: string;
  status: 'generated' | 'cached' | 'failed';
  error?: string;
}

export async function GET(request: Request): Promise<Response> {
  // Cron auth — verify the Vercel-supplied bearer token.
  const auth = request.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    // Distinct tickers — across all users. Drizzle doesn't have a clean
    // distinct helper for this; raw SQL keeps it readable.
    const rows = await db.execute<{ ticker: string }>(
      sql`SELECT DISTINCT ${breakingNewsTracked.ticker} AS ticker FROM ${breakingNewsTracked}`,
    );
    const tickers = (rows.rows ?? []).map((r) => r.ticker).filter(Boolean);

    if (tickers.length === 0) {
      return Response.json({ ok: true, generated: 0, skipped: 0, failed: 0, message: 'no trackers' });
    }

    // Bound concurrency so we don't blow Tavily/Gemini quotas in a single tick.
    const CONCURRENCY = 3;
    const perTicker: PerTickerResult[] = [];
    for (let i = 0; i < tickers.length; i += CONCURRENCY) {
      const batch = tickers.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((t) => generateForTicker(t)),
      );
      settled.forEach((res, idx) => {
        const ticker = batch[idx];
        if (res.status === 'fulfilled') {
          perTicker.push({ ticker, status: res.value.cached ? 'cached' : 'generated' });
        } else {
          const msg = res.reason instanceof Error ? res.reason.message : String(res.reason);
          perTicker.push({ ticker, status: 'failed', error: msg.slice(0, 200) });
        }
      });
    }

    const generated = perTicker.filter((r) => r.status === 'generated').length;
    const skipped = perTicker.filter((r) => r.status === 'cached').length;
    const failed = perTicker.filter((r) => r.status === 'failed').length;

    return Response.json({
      ok: true,
      generated,
      skipped,
      failed,
      results: perTicker,
    });
  } catch (err) {
    return safeErrorResponse(err, 'breaking-news/cron');
  }
}
