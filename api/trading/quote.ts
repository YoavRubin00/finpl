import type { VercelRequest, VercelResponse } from '@vercel/node';

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

const YAHOO_TICKER_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  XAU: 'GC=F',
  XAG: 'SI=F',
  'TA125.TA': '^TA125.TA',
};

const toYahooTicker = (assetId: string): string =>
  YAHOO_TICKER_MAP[assetId] ?? assetId;

interface ChartPoint {
  timestamp: number;
  /** Close price, kept as `price` for backward compatibility. */
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface QuoteResponse {
  ok: true;
  ticker: string;
  timeframe: Timeframe;
  price: number;
  previousClose: number | null;
  /** Yahoo quote currency — 'USD', 'ILS', or 'ILA' (TASE equities quote in
   *  AGOROT; clients must ÷100 to get shekels). null when Yahoo omits it. */
  currency: string | null;
  chart: ChartPoint[];
}

interface YahooChartResponse {
  chart?: {
    error?: { description?: string };
    result?: Array<{
      meta: { regularMarketPrice: number; previousClose?: number; chartPreviousClose?: number; currency?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }> };
    }>;
  };
}

const YAHOO_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'] as const;

/** Retry a transient provider failure on Yahoo's alternate chart host.
 * Every attempt is bounded; invalid symbols are not retried or fabricated.
 */
async function fetchChart(path: string): Promise<Response> {
  for (let index = 0; index < YAHOO_HOSTS.length; index++) {
    const host = YAHOO_HOSTS[index];
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${path}`, {
        // Expo also declares fetch/AbortSignal for native. This endpoint runs
        // on Node; both declarations describe the same runtime signal here.
        signal: AbortSignal.timeout(8_000) as unknown as NonNullable<RequestInit['signal']>,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (response.ok || response.status === 404 || index === YAHOO_HOSTS.length - 1) return response;
      console.warn('[trading/quote] Upstream response; trying alternate host', { host, status: response.status });
      await response.body?.cancel();
    } catch (error: unknown) {
      console.warn('[trading/quote] Upstream request failed', { host, reason: error instanceof Error ? error.name : 'unknown' });
      if (index === YAHOO_HOSTS.length - 1) throw error;
    }
  }
  throw new Error('Quote provider unavailable');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ticker = typeof req.query.ticker === 'string' ? req.query.ticker.trim().toUpperCase() : '';
    const timeframe = req.query.timeframe ?? '1D';

    if (!ticker) {
      return res.status(400).json({ error: 'Missing ticker query parameter' });
    }
    if (!/^[A-Z0-9^][A-Z0-9.^=_-]{0,39}$/.test(ticker)) {
      return res.status(400).json({ error: 'Invalid ticker query parameter' });
    }

    if (typeof timeframe !== 'string' || !VALID_TIMEFRAMES.has(timeframe)) {
      return res.status(400).json({
        error: `Invalid timeframe. Must be one of: ${Array.from(VALID_TIMEFRAMES).join(', ')}`,
      });
    }

    const tf = timeframe as Timeframe;
    const yahooTicker = toYahooTicker(ticker);
    const params = TIMEFRAME_PARAMS[tf];
    const yahooRes = await fetchChart(`${encodeURIComponent(yahooTicker)}?interval=${params.interval}&range=${params.range}`);

    if (!yahooRes.ok) {
      console.warn('[trading/quote] No quote available', { ticker, status: yahooRes.status });
      return res.status(yahooRes.status === 404 ? 404 : 502).json({
        error: `Yahoo Finance returned HTTP ${yahooRes.status}`,
      });
    }

    const json = await yahooRes.json() as YahooChartResponse;
    const result = json?.chart?.result?.[0];

    if (!result) {
      const errorDesc = json?.chart?.error?.description ?? 'No data for ticker';
      return res.status(404).json({ error: errorDesc });
    }

    const currentPrice: number = result.meta.regularMarketPrice;
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      console.warn('[trading/quote] Invalid provider price', { ticker });
      return res.status(502).json({ error: 'Quote provider returned no valid price' });
    }
    const rawPrevClose = result.meta.previousClose ?? result.meta.chartPreviousClose ?? null;
    const previousClose: number | null =
      typeof rawPrevClose === 'number' && isFinite(rawPrevClose) ? rawPrevClose : null;
    const timestamps: number[] = result.timestamp ?? [];

    // Yahoo returns parallel arrays: open/high/low/close/volume per timestamp.
    // When a field is missing for a given bar, fall back to `close` (flat candle).
    const q = result.indicators?.quote?.[0] ?? {};
    const opens: Array<number | null> = q.open ?? [];
    const highs: Array<number | null> = q.high ?? [];
    const lows: Array<number | null> = q.low ?? [];
    const closes: Array<number | null> = q.close ?? [];
    const volumes: Array<number | null> = q.volume ?? [];

    const chart: ChartPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close === null || close === undefined) continue;
      const open = typeof opens[i] === 'number' ? (opens[i] as number) : close;
      const high = typeof highs[i] === 'number' ? (highs[i] as number) : close;
      const low = typeof lows[i] === 'number' ? (lows[i] as number) : close;
      const volume = typeof volumes[i] === 'number' ? (volumes[i] as number) : 0;
      chart.push({
        timestamp: timestamps[i] * 1000,
        price: close,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    const body: QuoteResponse = {
      ok: true,
      ticker,
      timeframe: tf,
      price: currentPrice,
      previousClose,
      currency: typeof result.meta.currency === 'string' ? result.meta.currency : null,
      chart,
    };

    res.setHeader('Cache-Control', 'public, s-maxage=5, max-age=0');
    return res.status(200).json(body);
  } catch (err: unknown) {
    console.warn('[trading/quote] Quote unavailable', { reason: err instanceof Error ? err.name : 'unknown' });
    return res.status(502).json({ error: 'Quote provider temporarily unavailable' });
  }
}
