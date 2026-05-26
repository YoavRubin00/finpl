/**
 * GET /api/daily-news-challenge/today
 *
 * Returns today's challenge for the client. Read-only — no rate-limit on
 * auth, all users share the same row.
 *
 * If today's row hasn't been generated yet (cron hasn't run), falls back to
 * the most recent row so the UI never shows an empty state.
 */

import { desc } from 'drizzle-orm';
import { dailyNewsChallenge } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { getDateKeyIL, getDb, type DailyChallengePayload } from './_lib';

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'daily-news-challenge-today', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const dateKey = getDateKeyIL();
    const db = getDb();

    // Today's row first; if missing, latest row as fallback.
    const rows = await db
      .select()
      .from(dailyNewsChallenge)
      .orderBy(desc(dailyNewsChallenge.dateKey))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return Response.json({ ok: false, error: 'no challenge available yet' }, { status: 404 });
    }

    const payload: DailyChallengePayload = {
      heroTitle: row.heroTitle,
      heroImageUrl: row.heroImageUrl,
      items: row.items as DailyChallengePayload['items'],
      sourcesUsed: row.sourcesUsed as DailyChallengePayload['sourcesUsed'],
    };

    return Response.json({
      ok: true,
      dateKey: row.dateKey,
      isToday: row.dateKey === dateKey,
      isFallback: row.isFallback ?? false,
      ...payload,
    });
  } catch (err) {
    return safeErrorResponse(err, 'daily-news-challenge/today');
  }
}
