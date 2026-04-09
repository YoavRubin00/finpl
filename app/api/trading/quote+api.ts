/**
 * GET /api/trading/quote?ticker=AAPL&timeframe=1D
 *
 * Server-side proxy for Yahoo Finance chart data.
 * Rate-limited and cached.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

type Timeframe = '1MIN' | '5MIN' | '1H' | '1D' | '1W';

interface YahooParams {
  interval: string;
  range: string;
}

const TIMEFRAME_PARAMS: Record<Timeframe, YahooParams> = {
  '1MIN': { interval: '1m', range: '1d' },
  '5MIN': { interval: '5m', range: '1d' },
  '1H': { interval: '1h', range: '5d' },
  '1D': { interval: '1d', range: '1mo' },
  '1W': { interval: '1wk', range: '6mo' },
};

const VALID_TIMEFRAMES = new Set<string>(Object.keys(TIMEFRAME_PARAMS));

/** Map internal asset IDs to Yahoo Finance tickers */
const YAHOO_TICKER_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  XAU: 'GC=F',
  XAG: 'SI=F',
};

const toYahooTicker = (assetId: string): string =>
  YAHOO_TICKER_MAP[assetId] ?? assetId;

// Allowlist: only tickers matching this pattern are accepted
const TICKER_PATTERN = /^[A-Z0-9.=^-]{1,12}$/;

interface ChartPoint {
  timestamp: number;
  price: number;
}

interface QuoteResponse {
  ok: true;
  ticker: string;
  timeframe: Timeframe;
  price: number;
  chart: ChartPoint[];
}

/** Yahoo Finance endpoints — try query2 first (more reliable), fall back to query1 */
const YAHOO_HOSTS = [
  'https://query2.finance.yahoo.com',
  'https://query1.finance.yahoo.com',
] as const;

const CHART_PATH = '/v8/finance/chart';

// Simple in-memory response cache (5 min TTL)
const cache = new Map<string, { data: QuoteResponse; expiresAt: number }>();

/** Stored crumb/cookie pair for authenticated Yahoo requests */
let authCrumb: { crumb: string; cookie: string; expiresAt: number } | null = null;

/**
 * Yahoo Finance now requires a crumb + session cookie for v8 endpoints.
 * Fetch a consent page to obtain both.
 */
async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (authCrumb && authCrumb.expiresAt > Date.now()) {
    return { crumb: authCrumb.crumb, cookie: authCrumb.cookie };
  }
  try {
    // Step 1: get session cookie from consent page
    const consentRes = await fetch('https://fc.yahoo.com', { redirect: 'manual' });
    const setCookie = consentRes.headers.get('set-cookie') ?? '';
    const cookie = setCookie.split(';')[0]; // e.g. "A3=d=AQA..."
    if (!cookie) return null;

    // Step 2: use cookie to fetch crumb
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' },
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes('<')) return null; // HTML error page

    authCrumb = { crumb, cookie, expiresAt: Date.now() + 30 * 60_000 }; // 30 min TTL
    return { crumb, cookie };
  } catch {
    return null;
  }
}

/**
 * Attempt to fetch chart data from Yahoo, trying multiple hosts and
 * both authenticated (crumb) and unauthenticated modes.
 */
async function fetchYahooChart(
  yahooTicker: string,
  params: YahooParams,
): Promise<Response | null> {
  const auth = await getYahooCrumb();

  for (const host of YAHOO_HOSTS) {
    const baseUrl = `${host}${CHART_PATH}/${encodeURIComponent(yahooTicker)}?interval=${params.interval}&range=${params.range}`;

    // Try with crumb first (if available)
    if (auth) {
      try {
        const res = await fetch(`${baseUrl}&crumb=${encodeURIComponent(auth.crumb)}`, {
          headers: {
            Cookie: auth.cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
        });
        if (res.ok) return res;
      } catch {
        // continue to next attempt
      }
    }

    // Try without crumb (still works for some endpoints)
    try {
      const res = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });
      if (res.ok) return res;
    } catch {
      // continue to next host
    }
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  // Rate limit: 60 quotes per minute per client
  const blocked = enforceRateLimit(request, 'trading-quote', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const rawTicker = sanitizeString(url.searchParams.get('ticker'), 12);
    const timeframe = url.searchParams.get('timeframe') ?? '1D';

    if (!rawTicker || !TICKER_PATTERN.test(rawTicker)) {
      return Response.json({ error: 'Invalid ticker' }, { status: 400 });
    }

    if (!VALID_TIMEFRAMES.has(timeframe)) {
      return Response.json(
        { error: `Invalid timeframe. Must be one of: ${[...VALID_TIMEFRAMES].join(', ')}` },
        { status: 400 },
      );
    }

    const tf = timeframe as Timeframe;
    const yahooTicker = toYahooTicker(rawTicker);

    // Check cache
    const cacheKey = `${yahooTicker}:${tf}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json(cached.data);
    }

    const params = TIMEFRAME_PARAMS[tf];
    const yahooRes = await fetchYahooChart(yahooTicker, params);

    if (!yahooRes) {
      // Invalidate crumb so it's refreshed on next request
      authCrumb = null;
      return Response.json(
        { error: 'Market data temporarily unavailable.' },
        { status: 502 },
      );
    }

    const json = await yahooRes.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return Response.json({ error: 'No data for this ticker.' }, { status: 404 });
    }

    const currentPrice: number = result.meta.regularMarketPrice;
    const timestamps: number[] = result.timestamp ?? [];
    const closes: Array<number | null> = result.indicators?.quote?.[0]?.close ?? [];

    const chart: ChartPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i];
      if (price !== null && price !== undefined) {
        chart.push({ timestamp: timestamps[i] * 1000, price });
      }
    }

    const body: QuoteResponse = {
      ok: true,
      ticker: rawTicker,
      timeframe: tf,
      price: currentPrice,
      chart,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, { data: body, expiresAt: Date.now() + 5 * 60_000 });

    return Response.json(body);
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trading/quote');
  }
}
