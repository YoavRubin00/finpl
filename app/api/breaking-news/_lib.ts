/**
 * Shared helpers for the Breaking News API surface:
 *   - generateForTicker(): idempotent Tavily→Gemini→Neon pipeline for one
 *     ticker on one trading day. Used by both `cron` (loops over distinct
 *     tickers) and `generate` (single ticker, on-demand from the client).
 *   - getTradingDayKey(): same TZ logic as the trading-hub (Asia/Jerusalem
 *     rollover at 23:30) so summaries land on the day a user would expect.
 *
 * Keeping this logic in one file means a future change (e.g. swapping
 * Tavily for Perplexity) touches a single function.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';

import { breakingNewsSummaries } from '../../../src/db/schema';
import { fetchTickerNews } from '../_shared/perplexityNews';
import { tavilyNewsSearch, type TavilyBundle } from '../_shared/tavily';
import { withRetry, isTransientAiError } from '../_shared/retry';
import { formatFailuresForRetryHint } from '../_shared/simplicityCheck';
import {
  BREAKING_NEWS_SYSTEM_PROMPT,
  buildBreakingNewsUserPrompt,
  normalizeBreakingNewsSummary,
  checkBreakingNewsSimplicity,
  type BreakingNewsSummary,
} from '../ai/_prompts/breakingNewsPrompt';

const GEMINI_MODEL = 'gemini-2.5-flash';

export function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

/** YYYY-MM-DD anchored to Israel time, rolling at 23:30 so the cron at
 *  06:00 UTC (≈09:00 IST) lands on the "right" trading day. Mirrors the
 *  client-side helper in `marketApiService.tradingDayKey()`. */
export function getTradingDayKey(now: Date = new Date()): string {
  // Israel is UTC+2 in winter, UTC+3 in summer. Use Intl to handle DST.
  const il = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  if (il.getHours() < 23 || (il.getHours() === 23 && il.getMinutes() < 30)) {
    // Before 23:30 IST — today is the trading day.
    return il.toISOString().slice(0, 10);
  }
  // After 23:30 IST — roll to tomorrow.
  const next = new Date(il.getTime() + 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

/**
 * Run the full pipeline for a single ticker. Returns the row that's now
 * persisted (either freshly generated or the existing cached row).
 *
 * Idempotent by `(ticker, trading_day)` UNIQUE constraint — calling twice
 * in the same day is safe and cheap.
 */
export async function generateForTicker(
  ticker: string,
  options: { force?: boolean } = {},
): Promise<{
  ticker: string;
  tradingDay: string;
  summary: BreakingNewsSummary;
  cached: boolean;
}> {
  const db = getDb();
  const tradingDay = getTradingDayKey();

  if (!options.force) {
    const existing = await db
      .select()
      .from(breakingNewsSummaries)
      .where(and(
        eq(breakingNewsSummaries.ticker, ticker),
        eq(breakingNewsSummaries.tradingDay, tradingDay),
      ))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      return {
        ticker,
        tradingDay,
        cached: true,
        summary: {
          summary: row.summaryText,
          hypeIndex: row.hypeIndex,
          sentiment: row.sentiment as 'bullish' | 'bearish' | 'neutral',
          keyEvents: (row.keyEvents as BreakingNewsSummary['keyEvents']) ?? [],
          sources: (row.sources as BreakingNewsSummary['sources']) ?? [],
        },
      };
    }
  }

  // 1) Fetch fresh news + social snippets for this ticker.
  //    Prefer Tavily when TAVILY_API_KEY is configured (purpose-built for
  //    news, with domain filtering + a day range). Fall back to Perplexity
  //    (always available — same key as the deep analyzer) when Tavily isn't
  //    configured, OR when a configured Tavily errors / returns 0 results.
  //    This keeps the feature working in every environment: locally (no
  //    Tavily key → Perplexity) and in production (Tavily, with Perplexity
  //    as a safety net).
  let bundle: TavilyBundle;
  if (process.env.TAVILY_API_KEY) {
    try {
      bundle = await tavilyNewsSearch(ticker, { timeRange: 'day', maxResults: 10 });
      if (bundle.results.length === 0) throw new Error('tavily returned 0 results');
    } catch (tavilyErr) {
      const msg = tavilyErr instanceof Error ? tavilyErr.message : String(tavilyErr);
      console.warn(`[breaking-news] Tavily failed for ${ticker} (${msg}) — falling back to Perplexity`);
      bundle = await fetchTickerNews(ticker, { maxResults: 10 });
    }
  } else {
    bundle = await fetchTickerNews(ticker, { maxResults: 10 });
  }
  if (bundle.results.length === 0) {
    throw new Error(`news search returned 0 results for ${ticker}`);
  }

  // 2) Gemini — structure the bundle into the JSON shape we persist.
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured');

  const geminiBody = {
    system_instruction: { parts: [{ text: BREAKING_NEWS_SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildBreakingNewsUserPrompt(ticker, bundle) }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  };

  // Wrap the Gemini call + parse + simplicity gate in withRetry. Same
  // pattern as daily-news-challenge: when the model returns dry
  // journalistic Hebrew that fails simplicityCheck, re-roll up to 2
  // more times. shouldRetry covers transient HTTP errors AND the
  // simplicity_failed message so 1 path retries everything.
  const summary = await withRetry<BreakingNewsSummary>(
    async () => {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        },
      );

      if (!geminiRes.ok) {
        const text = await geminiRes.text().catch(() => '');
        throw new Error(`Gemini ${geminiRes.status}: ${text.slice(0, 200)}`);
      }

      const data = (await geminiRes.json()) as GeminiResponse;
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error('Gemini returned empty content');

      const parsed = JSON.parse(rawJson) as unknown;
      const normalized = normalizeBreakingNewsSummary(parsed);

      // Simplicity gate. 2+ failures = re-roll. 0-1 = accept (1 is noise).
      const failures = checkBreakingNewsSimplicity(normalized);
      if (failures.length >= 2) {
        throw new Error(`simplicity_failed: ${formatFailuresForRetryHint(failures)}`);
      }

      return normalized;
    },
    {
      attempts: 3,
      baseDelayMs: 500,
      shouldRetry: (err) => {
        if (isTransientAiError(err)) return true;
        const msg = err instanceof Error ? err.message : String(err);
        return /JSON\.parse|Unterminated|malformed|simplicity_failed|missing/i.test(msg);
      },
      label: `gemini/breaking-news/${ticker}`,
    },
  );

  // 3) Persist. `onConflictDoUpdate` so a forced re-run during the day
  //    overwrites the previous summary cleanly.
  await db
    .insert(breakingNewsSummaries)
    .values({
      ticker,
      tradingDay,
      summaryText: summary.summary,
      hypeIndex: summary.hypeIndex,
      sentiment: summary.sentiment,
      keyEvents: summary.keyEvents,
      sources: summary.sources,
    })
    .onConflictDoUpdate({
      target: [breakingNewsSummaries.ticker, breakingNewsSummaries.tradingDay],
      set: {
        summaryText: summary.summary,
        hypeIndex: summary.hypeIndex,
        sentiment: summary.sentiment,
        keyEvents: summary.keyEvents,
        sources: summary.sources,
        generatedAt: new Date().toISOString(),
      },
    });

  return { ticker, tradingDay, summary, cached: false };
}
