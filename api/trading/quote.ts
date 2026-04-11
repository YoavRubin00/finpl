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
};

const toYahooTicker = (assetId: string): string =>
  YAHOO_TICKER_MAP[assetId] ?? assetId;

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

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ticker = req.query.ticker as string | undefined;
    const timeframe = (req.query.timeframe as string) ?? '1D';

    if (!ticker) {
      return res.status(400).json({ error: 'Missing ticker query parameter' });
    }

    if (!VALID_TIMEFRAMES.has(timeframe)) {
      return res.status(400).json({
        error: `Invalid timeframe. Must be one of: ${Array.from(VALID_TIMEFRAMES).join(', ')}`,
      });
    }

    const tf = timeframe as Timeframe;
    const yahooTicker = toYahooTicker(ticker);
    const params = TIMEFRAME_PARAMS[tf];
    const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(yahooTicker)}?interval=${params.interval}&range=${params.range}`;

    const yahooRes = await fetch(yahooUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!yahooRes.ok) {
      return res.status(502).json({
        error: `Yahoo Finance returned HTTP ${yahooRes.status}`,
      });
    }

    const json = await yahooRes.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      const errorDesc = json?.chart?.error?.description ?? 'No data for ticker';
      return res.status(404).json({ error: errorDesc });
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
      ticker,
      timeframe: tf,
      price: currentPrice,
      chart,
    };

    return res.status(200).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
