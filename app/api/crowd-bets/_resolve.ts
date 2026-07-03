/**
 * Server-side outcome resolver for prediction settlement. Does ONLY the network
 * I/O to obtain a real market reading, then defers to the pure spec + resolver in
 * `src/features/crowd-wisdom/lib/betResolution.ts`. Returns the winning choice, or
 * `null` when reality can't be read (→ the settle-cron refunds every stake).
 */

import {
  BET_RESOLUTIONS,
  resolveOutcome,
  type BetResolutionSpec,
  type YahooInstrument,
  type RealMarketReading,
  type ResolvedOutcome,
} from '../../../src/features/crowd-wisdom/lib/betResolution';

const TIMEOUT_MS = 8_000;

const sig = () => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return ctrl.signal;
};

/** Yahoo symbols for every price/level instrument (BOI_RATE is not from Yahoo). */
const YAHOO_SYMBOL: Record<YahooInstrument, string> = {
  TA35: 'TA35.TA', // no caret — the ^TA35.TA form is delisted on Yahoo
  SP500: '%5EGSPC',
  USDILS: 'USDILS=X',
  BTC: 'BTC-USD',
  TSLA: 'TSLA',
};

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
}

/** Latest level via `meta.regularMarketPrice` (robust — the daily close array's
 *  last bar is often null mid-session). */
async function yahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      { signal: sig() } as RequestInit,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChart;
    const meta = json.chart?.result?.[0]?.meta;
    const px = meta?.regularMarketPrice;
    if (typeof px === 'number' && Number.isFinite(px)) return px;
    const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
      .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));
    return closes.length ? closes[closes.length - 1] : null;
  } catch {
    return null;
  }
}

/** Weekly % change over the last ~5 sessions (first→last valid close). */
async function yahooWeeklyChangePct(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`,
      { signal: sig() } as RequestInit,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChart;
    const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
      .filter((c): c is number => typeof c === 'number' && Number.isFinite(c) && c > 0);
    if (closes.length < 2) return null;
    const first = closes[0];
    const last = closes[closes.length - 1];
    return ((last - first) / first) * 100;
  } catch {
    return null;
  }
}

/** Bank-of-Israel rate delta in percentage points (latest − previous). */
async function boiRateDelta(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI/IR/1.0?lastNObservations=2',
      { headers: { Accept: 'application/json' }, signal: sig() } as RequestInit,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, number[]> }> }> };
    };
    const series = json?.data?.dataSets?.[0]?.series;
    if (!series) return null;
    const key = Object.keys(series)[0];
    const obs = series[key]?.observations;
    if (!obs) return null;
    const sorted = Object.keys(obs).sort((a, b) => Number(b) - Number(a));
    const latest = Number(obs[sorted[0]]?.[0]);
    const prev = sorted.length > 1 ? Number(obs[sorted[1]]?.[0]) : latest;
    if (!Number.isFinite(latest) || !Number.isFinite(prev)) return null;
    return latest - prev;
  } catch {
    return null;
  }
}

async function readInstrument(spec: BetResolutionSpec): Promise<RealMarketReading> {
  switch (spec.kind) {
    case 'bracket':
    case 'threshold': {
      const value = await yahooPrice(YAHOO_SYMBOL[spec.instrument]);
      return value === null ? {} : { value };
    }
    case 'weekly_drop': {
      const weeklyChangePct = await yahooWeeklyChangePct(YAHOO_SYMBOL[spec.instrument]);
      return weeklyChangePct === null ? {} : { weeklyChangePct };
    }
    case 'rate_direction': {
      const rateDelta = await boiRateDelta();
      return rateDelta === null ? {} : { rateDelta };
    }
  }
}

/** Resolve one question to a winning choice + refund choices, or null (refund all). */
export async function resolveQuestion(questionId: string): Promise<ResolvedOutcome | null> {
  const spec = BET_RESOLUTIONS[questionId];
  if (!spec) return null;
  const reading = await readInstrument(spec);
  return resolveOutcome(spec, reading);
}
