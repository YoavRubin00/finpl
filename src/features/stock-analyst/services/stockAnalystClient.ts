import { Platform } from 'react-native';
import { getApiBase } from '../../../db/apiBase';
import type {
  StockAnalysisDeep,
  StockAnalysisQuick,
  StockHorizon,
} from '../types';

const PROD_API_BASE = 'https://finpl.vercel.app';

function resolveBase(): string {
  // Expo Router doesn't serve `+api.ts` routes in `output: "single"` mode on
  // localhost web dev — point the dev client at the deployed Vercel API.
  if (Platform.OS === 'web') {
    const w = (globalThis as { location?: { hostname?: string } }).location;
    const host = w?.hostname ?? '';
    if (host === 'localhost' || host === '127.0.0.1') return PROD_API_BASE;
  }
  return getApiBase() || PROD_API_BASE;
}

interface QuickRequest {
  ticker: string;
  companyName: string;
  exchange: string;
  horizon: StockHorizon;
  priceContext?: {
    price: number;
    priceChangePct: number;
    currency: string;
  };
}

interface DeepRequest {
  ticker: string;
  companyName: string;
  exchange: string;
  horizon: StockHorizon;
  marketContext?: {
    price?: number;
    priceChangePct?: number;
    currency?: string;
    range52w?: { low: number; high: number };
    avgVolume?: number;
  };
}

interface QuickServerResponse {
  ok: true;
  verdict: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
  confidence: number;
  captainNote: string;
  targetNote?: string;
  commentary: StockAnalysisQuick['commentary'];
}

interface QuoteResponse {
  ok: true;
  ticker: string;
  price: number;
  previousClose: number | null;
  chart: Array<{ timestamp: number; price: number }>;
}

/**
 * Fetch live quote (price + prevClose + 1D chart) via the deployed
 * Vercel trading endpoint. We hit it directly instead of going through
 * `marketApiService` because that helper defaults to a relative URL on
 * web, which doesn't resolve under Expo's `output: "single"` dev server.
 */
export async function fetchLiveQuote(ticker: string): Promise<QuoteResponse | null> {
  const base = resolveBase();
  try {
    const res = await fetch(`${base}/api/trading/quote?ticker=${encodeURIComponent(ticker)}&timeframe=1D`);
    if (!res.ok) return null;
    return (await res.json()) as QuoteResponse;
  } catch {
    return null;
  }
}

export async function fetchQuickAnalysis(req: QuickRequest): Promise<QuickServerResponse> {
  const base = resolveBase();
  const res = await fetch(`${base}/api/ai/stock-analyze-quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`quick analysis failed (${res.status}): ${detail.slice(0, 100)}`);
  }
  return (await res.json()) as QuickServerResponse;
}

export async function fetchDeepAnalysis(req: DeepRequest): Promise<StockAnalysisDeep> {
  const base = resolveBase();
  const res = await fetch(`${base}/api/ai/stock-analyze-deep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`deep analysis failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { ok: true } & StockAnalysisDeep;
  return json;
}
