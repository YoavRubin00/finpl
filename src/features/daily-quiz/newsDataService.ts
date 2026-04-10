/**
 * Market data fetchers for the Daily Quiz pipeline.
 * Each function returns a standardized DataPoint for quiz generation.
 */

import { getApiBase } from '../../db/apiBase';

export interface DataPoint {
  value: string;
  label: string;
  direction: 'up' | 'down' | 'stable';
  category: import('./dailyQuizTypes').QuizCategory;
  /** Real-time news headline from RSS feed */
  newsHeadline?: string;
  /** First sentences of the news article */
  newsSummary?: string;
  /** Source name (e.g., "גלובס") */
  newsSource?: string;
}

// ── Daily cache ──
const todayKey = (): string => new Date().toISOString().slice(0, 10);

interface CacheEntry {
  data: DataPoint;
  date: string;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): DataPoint | null {
  const entry = cache.get(key);
  if (entry && entry.date === todayKey()) return entry.data;
  return null;
}

function setCache(key: string, data: DataPoint): void {
  cache.set(key, { data, date: todayKey() });
}

// ── USD/ILS — Bank of Israel API ──
export async function fetchUsdIls(): Promise<DataPoint> {
  const cached = getCached('usd-ils');
  if (cached) return cached;

  try {
    const today = todayKey();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const url = `https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI/EXR/1.0?startperiod=${weekAgo}&endperiod=${today}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`BOI API ${res.status}`);
    const json = await res.json();

    // Parse SDMX-JSON response — extract USD/ILS rate
    const series = json?.data?.dataSets?.[0]?.series;
    if (!series) throw new Error('No series data');

    // Find USD series (key varies) — get last observation
    const seriesKeys = Object.keys(series);
    const usdKey = seriesKeys[0]; // First series is typically USD
    const observations = series[usdKey]?.observations;
    if (!observations) throw new Error('No observations');

    const obsKeys = Object.keys(observations).sort((a, b) => Number(b) - Number(a));
    const latestValue = observations[obsKeys[0]]?.[0];
    const previousValue = obsKeys.length > 1 ? observations[obsKeys[1]]?.[0] : latestValue;

    const rate = Number(latestValue);
    const prev = Number(previousValue);
    const direction = rate > prev ? 'up' : rate < prev ? 'down' : 'stable';

    const result: DataPoint = {
      value: `${rate.toFixed(2)}₪`,
      label: 'שער דולר/שקל',
      direction,
      category: 'USD_ILS',
    };
    setCache('usd-ils', result);
    return result;
  } catch {
    // Fallback — last known value
    const fallback: DataPoint = {
      value: '3.62₪',
      label: 'שער דולר/שקל',
      direction: 'stable',
      category: 'USD_ILS',
    };
    setCache('usd-ils', fallback);
    return fallback;
  }
}

// ── Interest Rate — Bank of Israel ──
export async function fetchInterestRate(): Promise<DataPoint> {
  const cached = getCached('interest-rate');
  if (cached) return cached;

  try {
    const url = 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI/IR/1.0?lastNObservations=2';
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`BOI IR API ${res.status}`);
    const json = await res.json();

    const series = json?.data?.dataSets?.[0]?.series;
    if (!series) throw new Error('No series');

    const seriesKeys = Object.keys(series);
    const observations = series[seriesKeys[0]]?.observations;
    if (!observations) throw new Error('No observations');

    const obsKeys = Object.keys(observations).sort((a, b) => Number(b) - Number(a));
    const latest = Number(observations[obsKeys[0]]?.[0]);
    const prev = obsKeys.length > 1 ? Number(observations[obsKeys[1]]?.[0]) : latest;
    const direction = latest > prev ? 'up' : latest < prev ? 'down' : 'stable';

    const result: DataPoint = {
      value: `${latest.toFixed(2)}%`,
      label: 'ריבית בנק ישראל',
      direction,
      category: 'INTEREST_RATE',
    };
    setCache('interest-rate', result);
    return result;
  } catch {
    const fallback: DataPoint = {
      value: '4.75%',
      label: 'ריבית בנק ישראל',
      direction: 'stable',
      category: 'INTEREST_RATE',
    };
    setCache('interest-rate', fallback);
    return fallback;
  }
}

// ── S&P 500 — via server-side proxy (keeps API keys server-side) ──
export async function fetchSP500(): Promise<DataPoint> {
  const cached = getCached('sp500');
  if (cached) return cached;

  try {
    const res = await fetch(`${getApiBase()}/api/trading/quote?ticker=SPY&timeframe=1D`);
    if (!res.ok) throw new Error(`Quote API ${res.status}`);
    const json = await res.json();

    const chart: Array<{ price: number }> = json.chart ?? [];
    const currentPrice: number = json.price ?? 0;
    const prevPrice = chart.length >= 2 ? chart[chart.length - 2]?.price ?? currentPrice : currentPrice;
    const changePct = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
    const direction = changePct > 0.1 ? 'up' : changePct < -0.1 ? 'down' : 'stable';

    const result: DataPoint = {
      value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
      label: 'S&P 500',
      direction,
      category: 'STOCK_INDEX',
    };
    setCache('sp500', result);
    return result;
  } catch {
    const fallback: DataPoint = {
      value: '+0.8%',
      label: 'S&P 500',
      direction: 'up',
      category: 'STOCK_INDEX',
    };
    setCache('sp500', fallback);
    return fallback;
  }
}

// ── TA-125 — Yahoo Finance (same pattern as marketApiService.ts) ──
export async function fetchTA125(): Promise<DataPoint> {
  const cached = getCached('ta125');
  if (cached) return cached;

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETA125.TA?interval=1d&range=2d';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Yahoo API ${res.status}`);
    const json = await res.json();

    const result = json.chart?.result?.[0];
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
    if (closes.length < 2) throw new Error('Not enough data');

    const latest = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const changePct = ((latest - prev) / prev) * 100;
    const direction = changePct > 0.1 ? 'up' : changePct < -0.1 ? 'down' : 'stable';

    const dataPoint: DataPoint = {
      value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
      label: 'מדד ת"א 125',
      direction,
      category: 'STOCK_INDEX',
    };
    setCache('ta125', dataPoint);
    return dataPoint;
  } catch {
    const fallback: DataPoint = {
      value: '+0.5%',
      label: 'מדד ת"א 125',
      direction: 'up',
      category: 'STOCK_INDEX',
    };
    setCache('ta125', fallback);
    return fallback;
  }
}

// ── Financial news from Globes RSS ──
const GLOBES_RSS = 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585';

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
}

let newsCache: { date: string; item: NewsItem | null } | null = null;

export async function fetchFinancialNews(): Promise<NewsItem | null> {
  if (newsCache && newsCache.date === todayKey()) return newsCache.item;
  try {
    const res = await fetch(GLOBES_RSS, { headers: { 'Accept': 'application/xml' } });
    const xml = await res.text();
    // Extract first <item> title and description
    const itemMatch = xml.match(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<description>([\s\S]*?)<\/description>/);
    if (!itemMatch) { newsCache = { date: todayKey(), item: null }; return null; }
    const headline = itemMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const summary = itemMatch[2].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;#8226;/g, '·').replace(/&amp;/g, '&').trim();
    const item: NewsItem = { headline, summary, source: 'גלובס' };
    newsCache = { date: todayKey(), item };
    return item;
  } catch {
    newsCache = { date: todayKey(), item: null };
    return null;
  }
}

/** Fetch data point by category, enriched with news context */
export async function fetchDataForCategory(
  category: import('./dailyQuizTypes').QuizCategory,
): Promise<DataPoint> {
  let dataPoint: DataPoint;
  switch (category) {
    case 'USD_ILS': dataPoint = await fetchUsdIls(); break;
    case 'INTEREST_RATE': dataPoint = await fetchInterestRate(); break;
    case 'STOCK_INDEX': dataPoint = await fetchSP500(); break;
    case 'CPI':
    default:
      dataPoint = {
        value: '+3.0%',
        label: 'אינפלציה שנתית',
        direction: 'up',
        category: 'CPI',
      };
  }

  // Enrich with real news headline
  const news = await fetchFinancialNews();
  if (news) {
    dataPoint.newsHeadline = news.headline;
    dataPoint.newsSummary = news.summary;
    dataPoint.newsSource = news.source;
  }

  return dataPoint;
}
