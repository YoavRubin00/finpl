import { ChartDataPoint, Timeframe } from './tradingHubTypes';
import { ASSET_BY_ID } from './tradingHubData';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── Trading-day cache ──
// Prices/charts refresh once per trading day at 23:30 Israel time. The cache
// key rolls over at that cutoff, so before 23:30 on any given date we still
// show yesterday's close (today's market hasn't "closed" yet), and at 23:30
// the next day's fresh data will be pulled on the first cache hit.
const tradingDayKey = (): string => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const y = get('year'), m = get('month'), d = get('day');
  const h = parseInt(get('hour'), 10) || 0;
  const min = parseInt(get('minute'), 10) || 0;
  const israelDate = `${y}-${m}-${d}`;
  // Before 23:30 Israel → trading day hasn't closed yet; snap to yesterday.
  if (h < 23 || (h === 23 && min < 30)) {
    const dt = new Date(`${israelDate}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  }
  return israelDate;
};

// Preserved for legacy compatibility with anything that still imports it.
const todayKey = tradingDayKey;

interface DailyCacheEntry<T> {
  data: T;
  date: string; // ISO trading-day key "YYYY-MM-DD"
}

const priceCache = new Map<string, DailyCacheEntry<number>>();
const chartCache = new Map<string, DailyCacheEntry<ChartDataPoint[]>>();
const previousCloseCache = new Map<string, DailyCacheEntry<number>>();

const isPriceFresh = (e: DailyCacheEntry<number> | undefined): e is DailyCacheEntry<number> =>
  e !== undefined && e.date === tradingDayKey();

const isChartFresh = (e: DailyCacheEntry<ChartDataPoint[]> | undefined): e is DailyCacheEntry<ChartDataPoint[]> =>
  e !== undefined && e.date === tradingDayKey();

/** Returns true if there is no cached price for the current trading day. */
export const isCacheStale = (assetId: string): boolean => {
  const entry = priceCache.get(assetId);
  return entry === undefined || entry.date !== tradingDayKey();
};

/** ISO trading-day date (rolls at 23:30 Israel). Exposed for the UI "last updated" label. */
export const getTradingDayKey = (): string => tradingDayKey();

// ── Mock data fallback ──
// Deterministic seed based on ticker so mock data is consistent per asset
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateMockPrice = (ticker: string): number => {
  const basePrices: Record<string, number> = {
    AAPL: 248,
    MSFT: 455,
    NVDA: 1250,
    GOOGL: 195,
    AMZN: 230,
    META: 620,
    TSLA: 340,
    SPY: 600,
    QQQ: 530,
    'TA125.TA': 2280,
    XAU: 3050,
    XAG: 34,
    BTC: 87000,
    ETH: 4200,
  };
  const base = basePrices[ticker] ?? 100;
  // Daily seed: stable all day so mock price doesn't jitter on re-render
  const dayNum = Math.floor(Date.now() / 86_400_000);
  const seed = ticker.charCodeAt(0) + dayNum;
  const variance = seededRandom(seed) * 0.04 - 0.02; // ±2%
  return Math.round(base * (1 + variance) * 100) / 100;
};

const generateMockChartData = (
  ticker: string,
  timeframe: Timeframe,
): ChartDataPoint[] => {
  // After the live-data range bump in quote+api.ts, 1D = 6mo daily and 1W = 5y weekly.
  const pointCounts: Record<Timeframe, number> = {
    '1MIN': 390,
    '5MIN': 78,
    '1H': 40,
    '1D': 130,
    '1W': 260,
  };
  const intervalMs: Record<Timeframe, number> = {
    '1MIN': 60_000,
    '5MIN': 5 * 60_000,
    '1H': 60 * 60_000,
    '1D': 24 * 60 * 60_000,
    '1W': 7 * 24 * 60 * 60_000,
  };
  const count = pointCounts[timeframe];
  const step = intervalMs[timeframe];
  const basePrice = generateMockPrice(ticker);
  const now = Date.now();
  const points: ChartDataPoint[] = [];

  // Random walk: each close is the previous close ± a small step. This gives
  // organic-looking trends instead of a zig-zag around `basePrice`.
  let close = basePrice;
  // Daily-deterministic seed offset so the same day yields the same shape.
  const dayNum = Math.floor(now / 86_400_000);
  const tickerSeed = ticker.charCodeAt(0) * 7 + (ticker.length || 1) * 13 + dayNum;

  for (let i = 0; i < count; i++) {
    const stepSeed = tickerSeed * 100 + i;
    // Small random step ±1.2% per bar; keeps prices near the base over time.
    const drift = seededRandom(stepSeed) * 0.024 - 0.012;
    const meanReversion = (basePrice - close) / basePrice * 0.05;
    close = close * (1 + drift + meanReversion);
    const open = close * (1 + (seededRandom(stepSeed + 1) * 0.01 - 0.005));
    const wickHigh = Math.max(close, open) * (1 + seededRandom(stepSeed + 2) * 0.012);
    const wickLow = Math.min(close, open) * (1 - seededRandom(stepSeed + 3) * 0.012);
    const volume = Math.round((0.5 + seededRandom(stepSeed + 4) * 1.5) * 1_000_000);
    points.push({
      timestamp: now - (count - i) * step,
      price: round2(close),
      open: round2(open),
      high: round2(wickHigh),
      low: round2(wickLow),
      close: round2(close),
      volume,
    });
  }
  return points;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ── Core API functions ──

// ── API route proxy (avoids CORS issues with Yahoo Finance) ──
const PRODUCTION_API = 'https://finpl.vercel.app/api/trading/quote';
let API_BASE = '/api/trading/quote';

if (Platform.OS !== 'web') {
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    API_BASE = `http://${Constants.expoConfig.hostUri}/api/trading/quote`;
  } else if (process.env.EXPO_PUBLIC_API_URL) {
    API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api/trading/quote`;
  } else {
    // Fallback for native EAS builds where EXPO_PUBLIC_API_URL is not injected
    API_BASE = PRODUCTION_API;
  }
}

interface QuoteApiResponse {
  ok: true;
  ticker: string;
  timeframe: Timeframe;
  price: number;
  previousClose: number | null;
  chart: Array<{
    timestamp: number;
    price: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

/** Whether the last fetch returned real or mock data */
let lastFetchWasLive = false;

export const isDataLive = (): boolean => lastFetchWasLive;

/**
 * In-flight quote requests, keyed by assetId. De-dupes concurrent calls so that
 * `fetchLatestPrice` and `fetchPreviousClose` running in parallel share a single
 * network request instead of issuing two for the same ticker.
 */
const inflightQuotes = new Map<string, Promise<QuoteApiResponse | null>>();

const fetchQuote1D = (assetId: string): Promise<QuoteApiResponse | null> => {
  const existing = inflightQuotes.get(assetId);
  if (existing) return existing;
  const promise = (async (): Promise<QuoteApiResponse | null> => {
    try {
      const response = await fetch(`${API_BASE}?ticker=${encodeURIComponent(assetId)}&timeframe=1D`);
      if (!response.ok) return null;
      const json = (await response.json()) as QuoteApiResponse;
      return json.ok ? json : null;
    } catch {
      return null;
    }
  })().finally(() => {
    inflightQuotes.delete(assetId);
  });
  inflightQuotes.set(assetId, promise);
  return promise;
};

// ── Direct Yahoo fallback (native only, avoids CORS on web) ──
const YAHOO_TICKER_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  XAU: 'GC=F',
  XAG: 'SI=F',
};

const fetchYahooPriceDirect = async (assetId: string): Promise<number | null> => {
  if (Platform.OS === 'web') return null;
  const yTicker = YAHOO_TICKER_MAP[assetId] ?? assetId;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yTicker)}?interval=1d&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' && isFinite(price) ? price : null;
  } catch {
    return null;
  }
};

export const fetchLatestPrice = async (assetId: string): Promise<number> => {
  const cached = priceCache.get(assetId);
  if (isPriceFresh(cached)) return cached.data;

  // Primary: backend proxy (de-duped across concurrent callers)
  const json = await fetchQuote1D(assetId);
  if (json) {
    lastFetchWasLive = true;
    priceCache.set(assetId, { data: json.price, date: todayKey() });
    if (typeof json.previousClose === 'number' && isFinite(json.previousClose)) {
      previousCloseCache.set(assetId, { data: json.previousClose, date: todayKey() });
    }
    return json.price;
  }

  // Secondary: direct Yahoo (native only)
  const direct = await fetchYahooPriceDirect(assetId);
  if (direct !== null) {
    lastFetchWasLive = true;
    priceCache.set(assetId, { data: direct, date: todayKey() });
    return direct;
  }

  // Tertiary: mock (daily-deterministic, not cached so we keep retrying)
  lastFetchWasLive = false;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[marketApiService] fetchLatestPrice(${assetId}), falling back to mock data. Backend ${API_BASE} unreachable and direct Yahoo failed.`);
  }
  return generateMockPrice(assetId);
};

/**
 * Returns yesterday's close from the same API. Returns null when unavailable
 * (e.g. crypto without a previous close, network failure, mock fallback).
 * Shares the in-flight quote request with `fetchLatestPrice`, so calling both
 * in parallel results in a single network request.
 */
export const fetchPreviousClose = async (assetId: string): Promise<number | null> => {
  const cached = previousCloseCache.get(assetId);
  if (cached !== undefined && cached.date === todayKey()) return cached.data;

  const json = await fetchQuote1D(assetId);
  if (json && typeof json.previousClose === 'number' && isFinite(json.previousClose)) {
    previousCloseCache.set(assetId, { data: json.previousClose, date: todayKey() });
    // Opportunistically warm the price cache too, same payload.
    priceCache.set(assetId, { data: json.price, date: todayKey() });
    return json.previousClose;
  }

  return null;
};

export const fetchChartData = async (
  assetId: string,
  timeframe: Timeframe,
): Promise<ChartDataPoint[]> => {
  const cacheKey = `${assetId}:${timeframe}`;
  const cached = chartCache.get(cacheKey);
  if (isChartFresh(cached)) return cached.data;

  try {
    const response = await fetch(`${API_BASE}?ticker=${encodeURIComponent(assetId)}&timeframe=${timeframe}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = (await response.json()) as QuoteApiResponse;
    if (!json.ok) throw new Error('API error');
    // API returned ok but empty/thin chart — fall back to mock so UI never shows a blank chart
    if (!Array.isArray(json.chart) || json.chart.length < 2) throw new Error('empty chart');

    chartCache.set(cacheKey, { data: json.chart, date: todayKey() });
    return json.chart;
  } catch {
    // Don't cache mock data: if the backend recovers later today, the next call
    // should reach it instead of serving stale mock for the remainder of the day.
    return generateMockChartData(assetId, timeframe);
  }
};

export const isMarketOpen = (assetId: string): boolean => {
  const asset = ASSET_BY_ID.get(assetId);
  // Crypto is 24/7
  if (asset?.type === 'crypto') return true;

  const now = new Date();
  const day = now.getUTCDay();
  // Weekend check (Saturday = 6, Sunday = 0)
  if (day === 0 || day === 6) return false;

  // US market hours: 9:30 AM - 4:00 PM ET (roughly 14:30 - 21:00 UTC)
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcTime = utcHour * 60 + utcMinute;
  const marketOpen = 14 * 60 + 30; // 14:30 UTC
  const marketClose = 21 * 60; // 21:00 UTC

  return utcTime >= marketOpen && utcTime < marketClose;
};

export const clearCache = (): void => {
  priceCache.clear();
  chartCache.clear();
  previousCloseCache.clear();
};

/** Clears only price/previousClose caches, preserving cached chart data. */
export const clearPriceCache = (): void => {
  priceCache.clear();
  previousCloseCache.clear();
};
