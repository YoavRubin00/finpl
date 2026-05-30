/**
 * GET /api/breaking-news/list?authId=…
 *
 * Returns the caller's tracked tickers along with the latest summary for
 * each (today's if available, else the most recent generated). Used by the
 * client on mount + on focus to refresh the screen.
 *
 * The shape is intentionally flat — one row per ticker with the summary
 * fields inlined — so the client can render with a single `.map()` and no
 * joins.
 */

import { desc, eq, inArray } from 'drizzle-orm';
import {
  breakingNewsSummaries,
  breakingNewsTracked,
  userProfiles,
} from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { getDb, getTradingDayKey } from './_lib';
import type { BreakingNewsSummary } from '../ai/_prompts/breakingNewsPrompt';

interface ListItem {
  ticker: string;
  addedAt: string;
  summary: BreakingNewsSummary | null;
  tradingDay: string | null;
  generatedAt: string | null;
  /** True when there's no summary yet for today — UI shows a spinner / "מחפש חדשות". */
  pendingToday: boolean;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'breaking-news-list', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });

    const db = getDb();
    const userRows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = userRows[0];
    if (!validateSyncAuth(request, user?.syncToken ?? null) || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trackedRows = await db
      .select({ ticker: breakingNewsTracked.ticker, addedAt: breakingNewsTracked.addedAt })
      .from(breakingNewsTracked)
      .where(eq(breakingNewsTracked.userId, user.id));

    const todayKey = getTradingDayKey();

    // Fetch the latest summary for every tracked ticker in ONE round-trip.
    // DISTINCT ON (ticker) + ORDER BY ticker, tradingDay DESC gives us the
    // newest row per ticker — replaces the prior N+1 (one SELECT per ticker).
    const tickers = trackedRows.map((t) => t.ticker);
    const latestByTicker = tickers.length === 0
      ? []
      : await db
          .selectDistinctOn([breakingNewsSummaries.ticker])
          .from(breakingNewsSummaries)
          .where(inArray(breakingNewsSummaries.ticker, tickers))
          .orderBy(breakingNewsSummaries.ticker, desc(breakingNewsSummaries.tradingDay));

    const summaryByTicker = new Map<string, typeof latestByTicker[number]>();
    for (const row of latestByTicker) summaryByTicker.set(row.ticker, row);

    const items: ListItem[] = trackedRows.map((t) => {
      const row = summaryByTicker.get(t.ticker);
      if (!row) {
        return {
          ticker: t.ticker,
          addedAt: t.addedAt,
          summary: null,
          tradingDay: null,
          generatedAt: null,
          pendingToday: true,
        };
      }
      return {
        ticker: t.ticker,
        addedAt: t.addedAt,
        summary: {
          summary: row.summaryText,
          hypeIndex: row.hypeIndex,
          sentiment: row.sentiment as 'bullish' | 'bearish' | 'neutral',
          keyEvents: (row.keyEvents as BreakingNewsSummary['keyEvents']) ?? [],
          sources: (row.sources as BreakingNewsSummary['sources']) ?? [],
        },
        tradingDay: row.tradingDay,
        generatedAt: row.generatedAt,
        pendingToday: row.tradingDay !== todayKey,
      };
    });

    return Response.json({ ok: true, items, tradingDay: todayKey });
  } catch (err) {
    return safeErrorResponse(err, 'breaking-news/list');
  }
}
