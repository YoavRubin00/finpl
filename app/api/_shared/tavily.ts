/**
 * Tavily search client — minimal wrapper around the Tavily API used by the
 * Breaking News tool to fetch fresh news + social signals for a stock
 * ticker. Returns a typed bundle the LLM step then summarizes.
 *
 * Why Tavily and not raw RSS / NewsAPI: Tavily was designed for LLM
 * grounding, returns ranked snippets with source URLs and publish dates,
 * and accepts a `time_range` filter so we can ask for "today" only.
 *
 * Env: requires `TAVILY_API_KEY`. Calls fail-soft — if the key is missing
 * or Tavily errors out, we throw and the caller skips the ticker for the
 * day rather than crashing the whole cron run.
 */

export interface TavilyResult {
  /** Headline / page title. */
  title: string;
  /** Article URL. */
  url: string;
  /** Short snippet — usually the article lede. */
  content: string;
  /** Tavily's relevance score 0-1. */
  score?: number;
  /** ISO timestamp from the source. May be undefined if Tavily couldn't extract. */
  publishedDate?: string;
}

export interface TavilyBundle {
  /** Tavily's own one-shot summary of the search — usable as a coarse fallback. */
  answer?: string;
  /** Ranked individual article snippets — the meat of what we feed the LLM. */
  results: TavilyResult[];
}

interface RawTavilyResponse {
  answer?: string;
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    published_date?: string;
  }>;
}

/**
 * Search Tavily for recent news about a single ticker. Time-boxed to the
 * last day so we don't dilute the summary with stale stories.
 *
 * Throws on missing API key or non-2xx response — caller decides whether
 * to swallow (cron) or surface (on-demand generation).
 */
export async function tavilyNewsSearch(
  ticker: string,
  options: {
    timeRange?: 'day' | 'week';
    maxResults?: number;
  } = {},
): Promise<TavilyBundle> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const body = {
    api_key: apiKey,
    // Pair the ticker with "stock" to disambiguate (e.g. NVDA vs Nvidia
    // marketing pages) and broaden enough to catch social-discussion posts.
    query: `${ticker} stock news sentiment`,
    topic: 'news',
    search_depth: 'advanced',
    time_range: options.timeRange ?? 'day',
    max_results: options.maxResults ?? 10,
    include_answer: true,
    // Bias toward sources that publish financial coverage AND social
    // forums where retail-investor hype tends to surface first.
    include_domains: [
      'reuters.com',
      'bloomberg.com',
      'cnbc.com',
      'marketwatch.com',
      'seekingalpha.com',
      'finance.yahoo.com',
      'wsj.com',
      'investing.com',
      'stocktwits.com',
      'reddit.com',
      'globes.co.il',
      'themarker.com',
      'calcalist.co.il',
    ],
  };

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tavily ${res.status}: ${text.slice(0, 200)}`);
  }

  const raw = (await res.json()) as RawTavilyResponse;
  const results: TavilyResult[] = (raw.results ?? []).flatMap((r) => {
    if (!r.title || !r.url) return [];
    return [{
      title: r.title,
      url: r.url,
      content: r.content ?? '',
      score: r.score,
      publishedDate: r.published_date,
    }];
  });

  return { answer: raw.answer, results };
}
