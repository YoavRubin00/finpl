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
import { CDN_CACHE_HEADER, cdnCacheValue } from '../../../api/_shared/cdnCache';

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'daily-news-challenge-today', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const dateKey = getDateKeyIL();
    const db = getDb();

    // Today's row first; if missing, latest row as fallback. Only the columns
    // the response uses — sources_used (full audit trail) stays in the DB.
    const rows = await db
      .select({
        dateKey: dailyNewsChallenge.dateKey,
        heroTitle: dailyNewsChallenge.heroTitle,
        heroImageUrl: dailyNewsChallenge.heroImageUrl,
        items: dailyNewsChallenge.items,
        isFallback: dailyNewsChallenge.isFallback,
      })
      .from(dailyNewsChallenge)
      .orderBy(desc(dailyNewsChallenge.dateKey))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return Response.json({ ok: false, error: 'no challenge available yet' }, { status: 404 });
    }

    // Strip source attribution from the client-facing response — we don't
    // surface which feeds the LLM pulled from. The DB still has the full
    // sourcesUsed + per-item source/sourceUrl/originalTitle for audit.
    // Note: spread preserves the v2 fields (blankedHeadline/blankedEntity/
    // chips/correctChipIdx) so the client can render the curiosity-gap UI.
    const rawItems = row.items as DailyChallengePayload['items'];
    const safeItems = rawItems.map((it) => ({
      ...it,
      source: '',
      sourceUrl: '',
      originalTitle: '',
    })) as DailyChallengePayload['items'];

    // Stale-content detection. The row.isFallback DB column is only set
    // when an operator wrote a curated fallback by hand; it does NOT flip
    // when the cron silently misses a day and the user sees yesterday's
    // row. Treat any non-today row as a fallback so the client can
    // surface a "תוכן של אתמול" hint instead of pretending it's fresh.
    const isToday = row.dateKey === dateKey;
    const isFallback = !isToday || (row.isFallback ?? false);
    // One row for everyone, rewritten once a day by the 04:00 UTC cron. A
    // short CDN TTL keeps the new row visible within ~2 minutes of the cron
    // and bounds how long `isToday` can lag across Israeli midnight.
    return Response.json(
      {
        ok: true,
        dateKey: row.dateKey,
        isToday,
        isFallback,
        heroTitle: row.heroTitle,
        heroImageUrl: row.heroImageUrl,
        items: safeItems,
        sourcesUsed: [],
      },
      { headers: { [CDN_CACHE_HEADER]: cdnCacheValue(120, 600) } },
    );
  } catch (err) {
    return safeErrorResponse(err, 'daily-news-challenge/today');
  }
}
