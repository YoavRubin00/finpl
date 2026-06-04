/**
 * Perplexity Search API client.
 *
 * Why: Opus 4.7's knowledge cutoff is January 2026, but the stock-analyze-deep
 * schema asks for fields that REQUIRE fresh data (insider activity, upcoming
 * catalysts, current sentiment, analyst targets). Without grounding, Opus
 * hallucinates those values — a credibility leak for a feature literally
 * called "deep analysis".
 *
 * This module wraps Perplexity's POST /search endpoint, which returns raw
 * web search results (title + url + snippet) without an LLM intermediary.
 * The deep-analyze handler fans out 4 queries in parallel, formats the
 * results as a grounding block, and feeds them to Opus alongside the
 * existing market context. Opus stays in charge of reasoning, synthesis,
 * verdict consistency, and the Captain Shark voice.
 *
 * Why not Sonar (chat completions) or Agent API: those bake a SECOND LLM
 * into the loop, which (a) costs more tokens, (b) blends another model's
 * style into our Captain Shark voice, and (c) makes verdict consistency
 * harder because two models are reasoning about the same facts.
 *
 * Failure mode: if the API key is missing or the network fails, we return
 * an empty result set rather than throwing — Opus then gets a "no fresh
 * data available" grounding block and the system prompt instructs it to
 * mark factual fields as unknown. This keeps the deep analysis available
 * (degraded) instead of returning a 5xx to the user.
 */

const PERPLEXITY_SEARCH_URL = 'https://api.perplexity.ai/search';

export interface PerplexitySearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

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

function coerceString(value: unknown, max = 800): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function normalizeResult(raw: RawSearchResult): PerplexitySearchResult | null {
  const title = coerceString(raw.title, 200);
  const url = coerceString(raw.url, 500);
  // Perplexity has shipped both `snippet` and `content` (and occasionally
  // `text`) across versions — accept whichever the response uses.
  const snippet = coerceString(raw.snippet ?? raw.content ?? raw.text, 800);
  const date = coerceString(raw.date ?? raw.published_date ?? raw.publishedDate, 32);
  if (!title || !snippet) return null;
  return { title, url, snippet, ...(date ? { date } : {}) };
}

interface SearchOptions {
  /** Default 5. Capped at 10 to keep grounding-block token count predictable. */
  maxResults?: number;
  /** AbortSignal so the caller can enforce a timeout. */
  signal?: AbortSignal;
}

/**
 * Run one Perplexity Search query.
 *
 * Returns an empty array on any error (missing key, network failure, malformed
 * response) — never throws. The caller decides how to surface the degraded
 * grounding to the model.
 */
export async function searchPerplexity(
  query: string,
  options: SearchOptions = {}
): Promise<PerplexitySearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY ?? '';
  if (!apiKey) {
    console.warn('[perplexitySearch] PERPLEXITY_API_KEY missing — returning empty results');
    return [];
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const maxResults = Math.min(Math.max(options.maxResults ?? 5, 1), 10);

  try {
    const response = await fetch(PERPLEXITY_SEARCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: trimmedQuery,
        max_results: maxResults,
      }),
      // The DOM AbortSignal type and node's AbortSignal type diverge
      // slightly under @vercel/node — both work at runtime, but TS
      // refuses to unify them. Cast through RequestInit['signal'] is
      // the canonical workaround (no `any`).
      signal: options.signal as RequestInit['signal'],
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(
        `[perplexitySearch] ${response.status} for query="${trimmedQuery.slice(0, 80)}" body="${body.slice(0, 200)}"`
      );
      return [];
    }

    const json = (await response.json()) as RawSearchResponse;
    // Perplexity has used `results` historically and `data` in some
    // newer responses — accept either.
    const rawResults = Array.isArray(json.results)
      ? json.results
      : Array.isArray(json.data)
        ? json.data
        : [];

    return (rawResults as RawSearchResult[])
      .map(normalizeResult)
      .filter((r): r is PerplexitySearchResult => r !== null);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn(`[perplexitySearch] fetch failed for query="${trimmedQuery.slice(0, 80)}": ${message}`);
    return [];
  }
}

/**
 * Fan out multiple search queries in parallel.
 *
 * Each query returns independently — one failure does not bring down the
 * others. The caller gets a labeled map so the grounding block can show
 * the model which results came from which question.
 */
export async function searchPerplexityMany(
  queries: Array<{ label: string; query: string; maxResults?: number }>,
  options: { signal?: AbortSignal } = {}
): Promise<Array<{ label: string; query: string; results: PerplexitySearchResult[] }>> {
  const settled = await Promise.all(
    queries.map(async (q) => ({
      label: q.label,
      query: q.query,
      results: await searchPerplexity(q.query, {
        maxResults: q.maxResults,
        signal: options.signal,
      }),
    }))
  );
  return settled;
}

/**
 * Render the search results as a single grounding block that goes into the
 * Opus prompt. Format is intentionally simple — labeled sections, numbered
 * sources with a short header (title • date • domain) followed by the
 * snippet. URLs are kept full so Opus can quote them if needed.
 *
 * Snippets are truncated server-side via coerceString; this function just
 * lays them out. Total block size for 4 queries × 5 results × 800 chars
 * stays under ~18k chars — well within Opus's input window even after the
 * existing system prompt + schema.
 */
export function formatGroundingBlock(
  searches: Array<{ label: string; query: string; results: PerplexitySearchResult[] }>
): string {
  const sections = searches.map(({ label, query, results }) => {
    if (results.length === 0) {
      return `[${label}]\nשאילתה: ${query}\nתוצאות: אין נתונים זמינים.`;
    }
    const items = results.map((r, idx) => {
      const header = [r.title, r.date].filter(Boolean).join(' • ');
      return `  (${idx + 1}) ${header}\n      מקור: ${r.url}\n      ${r.snippet}`;
    });
    return `[${label}]\nשאילתה: ${query}\n${items.join('\n')}`;
  });
  return sections.join('\n\n');
}
