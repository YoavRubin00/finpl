/**
 * Perplexity-backed news search for the Breaking News tool.
 *
 * Replaces the Tavily step (which required a TAVILY_API_KEY that was never
 * configured in production — every generate threw before reaching Gemini).
 * Perplexity is already wired and paid for in this codebase: the deep stock
 * analyzer (api/ai/stock-analyze-deep.ts) grounds on the same PERPLEXITY_API_KEY
 * via api/_shared/perplexitySearch.ts. Reusing it means Breaking News works
 * with zero new accounts/keys.
 *
 * Returns a `TavilyBundle`-shaped result so the downstream Gemini prompt
 * (buildBreakingNewsUserPrompt) and _lib pipeline stay unchanged — only the
 * source of `results` differs. We keep this module self-contained in the
 * app/api tree (mirrors tavily.ts) rather than importing the sibling api/
 * module across trees.
 *
 * Throws on missing key / non-2xx so the caller (cron swallows, on-demand
 * generate surfaces) keeps the same control flow it had with Tavily.
 */

import type { TavilyBundle } from './tavily';

const PERPLEXITY_SEARCH_URL = 'https://api.perplexity.ai/search';

interface RawSearchResult {
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
  content?: unknown;
  text?: unknown;
  date?: unknown;
  published_date?: unknown;
  publishedDate?: unknown;
}

interface RawSearchResponse {
  results?: unknown;
  data?: unknown;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Fetch recent news for a single ticker via Perplexity Search and adapt it
 * into the TavilyBundle shape the summarizer expects.
 */
export async function fetchTickerNews(
  ticker: string,
  options: { maxResults?: number } = {},
): Promise<TavilyBundle> {
  const apiKey = process.env.PERPLEXITY_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const maxResults = Math.min(Math.max(options.maxResults ?? 10, 1), 10);

  const res = await fetch(PERPLEXITY_SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Pair ticker + "stock" + "today" to bias toward fresh financial news
      // and the social sentiment the hype index reads from.
      query: `${ticker} stock latest news today sentiment`,
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Perplexity ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as RawSearchResponse;
  // Perplexity has shipped both `results` and `data` across versions.
  const rawArr: unknown = Array.isArray(json.results)
    ? json.results
    : Array.isArray(json.data)
      ? json.data
      : [];

  const results = (rawArr as RawSearchResult[]).flatMap((r) => {
    const title = asString(r.title);
    const url = asString(r.url);
    // Field name has varied: snippet / content / text.
    const content = asString(r.snippet) || asString(r.content) || asString(r.text);
    const publishedDate =
      asString(r.date) || asString(r.published_date) || asString(r.publishedDate) || undefined;
    if (!title || !url) return [];
    return [{ title, url, content, publishedDate }];
  });

  return { results };
}
