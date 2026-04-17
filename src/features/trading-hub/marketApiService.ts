import { ChartDataPoint, Timeframe } from './tradingHubTypes';
import { ASSET_BY_ID } from './tradingHubData';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── Daily cache — prices cached once per calendar day ──
const todayKey = (): string => new Date().toISOString().slice(0, 10);

interface DailyCacheEntry<T> {
  data: T;
  date: string; // ISO date "YYYY-MM-DD"
}

const priceCache = new Map<string, DailyCacheEntry<number>>();
const chartCache = new Map<string, DailyCacheEntry<ChartDataPoint[]>>();
const previousCloseCache = new Map<string, DailyCacheEntry<number>>();

const isPriceFresh = (e: DailyCacheEntry<number> | undefined): e is DailyCacheEntry<number> =>
  e !== undefined && e.date === todayKey();

const isChartFresh = (e: DailyCacheEntry<ChartDataPoint[]> | undefined): e is DailyCacheEntry<ChartDataPoint[]> =>
  e !== undefined && e.date === todayKey();

/** Returns true if there is no cached price for today — a fresh fetch is needed. */
export const isCacheStale = (assetId: string): boolean => {
  const entry = priceCache.get(assetId);
  return entry === undefined || entry.date !== todayKey();
};

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
  const pointCounts: Record<Timeframe, number> = {
    '1MIN': 390,
    '5MIN': 78,
    '1H': 40,
    '1D': 22,
    '1W': 26,
  };
  const count = pointCounts[timeframe];
  const basePrice = generateMockPrice(ticker);
  const now = Date.now();
  const points: ChartDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const seed = ticker.charCodeAt(0) * 1000 + i;
    const drift = seededRandom(seed) * 0.06 - 0.03; // ±3%
    points.push({
      timestamp: now - (count - i) * 60000,
      price: Math.round(basePrice * (1 + drift) * 100) / 100,
    });
  }
  return points;
};

// ── Core API functions ──

// ── API route proxy (avoids CORS issues with Yahoo Finance) ──
let API_BASE = '/api/trading/quote';

if (Platform.OS !== 'web') {
  if (__DEV__ && Constants.expoConfig?.hostUri) {
    API_BASE = `http://${Constants.expoConfig.hostUri}/api/trading/quote`;
  } else if (process.env.EXPO_PUBLIC_API_URL) {
    API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api/trading/quote`;
  }
}

interface QuoteApiResponse {
  ok: true;
  ticker: string;
  timeframe: Timeframe;
  price: number;
  previousClose: number | null;
  chart: Array<{ timestamp: number; price: number }>;
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

// ── Direct Yahoo fallback (native only — avoids CORS on web) ──
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
    // Opportunistically warm the price cache too — same payload.
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

    chartCache.set(cacheKey, { data: json.chart, date: todayKey() });
    return json.chart;
  } catch {
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
