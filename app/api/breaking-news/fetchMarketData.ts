/**
 * Lightweight server-side market snapshot for GROUNDING the breaking-news hype
 * index in REAL price/volume movement (Yoav 2026-06-28). Previously the hype
 * index was a pure LLM guess from the news text alone — a stock could read
 * "FOMO/81-100" off verbose articles while the price never moved. This fetches
 * one Yahoo daily chart and derives today's % change + volume-vs-average so
 * Gemini can anchor the hype in what actually happened.
 *
 * Self-contained (its own minimal crumb dance) so it never touches the working
 * `app/api/trading/quote+api.ts` route. Best-effort: returns `null` on ANY
 * failure so summary generation is never blocked by a market-data hiccup.
 */

export interface MarketSnapshot {
  /** Today's % change vs the previous close. */
  changePct: number;
  /** Today's volume ÷ ~20-day average daily volume (1 = normal, 3 = 3× spike). */
  volumeMultiplier: number;
  price: number;
  previousClose: number;
}

const YAHOO_HOSTS = [
  'https://query2.finance.yahoo.com',
  'https://query1.finance.yahoo.com',
] as const;

const TICKER_PATTERN = /^[A-Z0-9.=^-]{1,12}$/;

/** Cached crumb/cookie pair (30-min TTL) — Yahoo's v8 endpoints need both. */
let authCrumb: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (authCrumb && authCrumb.expiresAt > Date.now()) {
    return { crumb: authCrumb.crumb, cookie: authCrumb.cookie };
  }
  try {
    const consentRes = await fetch('https://fc.yahoo.com', { redirect: 'manual' });
    const cookie = (consentRes.headers.get('set-cookie') ?? '').split(';')[0];
    if (!cookie) return null;
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' },
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes('<')) return null; // HTML error page
    authCrumb = { crumb, cookie, expiresAt: Date.now() + 30 * 60_000 };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

/**
 * Returns today's price action for `ticker`, or `null` if anything goes wrong
 * (bad ticker, Yahoo blocked, missing fields). Callers MUST treat null as
 * "no market grounding available" and proceed without it.
 */
export async function fetchMarketData(ticker: string): Promise<MarketSnapshot | null> {
  if (!TICKER_PATTERN.test(ticker)) return null;
  const auth = await getYahooCrumb();

  for (const host of YAHOO_HOSTS) {
    const url =
      `${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo` +
      (auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '');
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...(auth ? { Cookie: auth.cookie } : {}),
        },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number };
            indicators?: { quote?: Array<{ volume?: Array<number | null> }> };
          }>;
        };
      };
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta ?? {};
      const price = Number(meta.regularMarketPrice);
      const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose);
      if (!Number.isFinite(price) || !Number.isFinite(previousClose) || previousClose <= 0) {
        continue;
      }

      const volumes = (result.indicators?.quote?.[0]?.volume ?? []).filter(
        (v): v is number => typeof v === 'number' && v > 0,
      );
      const todayVol = volumes.length ? volumes[volumes.length - 1] : 0;
      const priorVols = volumes.slice(0, -1);
      const avgVol = priorVols.length
        ? priorVols.reduce((a, b) => a + b, 0) / priorVols.length
        : 0;
      const volumeMultiplier = avgVol > 0 ? todayVol / avgVol : 1;

      return {
        changePct: Math.round(((price - previousClose) / previousClose) * 1000) / 10,
        volumeMultiplier: Math.round(volumeMultiplier * 10) / 10,
        price,
        previousClose,
      };
    } catch {
      // Try the next host; if all fail we return null below.
    }
  }
  return null;
}
