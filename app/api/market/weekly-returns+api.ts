/**
 * GET /api/market/weekly-returns?tickers=AAPL,NVDA,BEZQ,BTC
 *
 * Real weekly change (%) per fantasy ticker from Yahoo Finance 7d closes —
 * powers the fantasy league's live mid-week returns. Per-ticker in-memory
 * cache (10 min). Unresolvable tickers return null and the client falls back
 * to the deterministic simulation, so the league never breaks offline.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 6_000;
const MAX_TICKERS = 40;
const TICKER_RE = /^[A-Z0-9.\-]{1,10}$/;

const _cache = new Map<string, { value: number | null; expiresAt: number }>();

/** Fantasy ticker → Yahoo symbol. TASE-only names get .TA; crypto gets -USD. */
const YAHOO_SYMBOLS: Record<string, string> = {
  SPX: '^GSPC', // S&P 500 — the fantasy "beat the market" benchmark (Moni RULING 2)
  TA125: '^TA125.TA', // TA-125 Israeli benchmark (reserved for future use)
  'BRK.B': 'BRK-B',
  POLI: 'POLI.TA',
  LUMI: 'LUMI.TA',
  MZTF: 'MZTF.TA',
  AZRG: 'AZRG.TA',
  ENLT: 'ENLT.TA',
  BEZQ: 'BEZQ.TA',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  BNB: 'BNB-USD',
  ADA: 'ADA-USD',
  DOGE: 'DOGE-USD',
};

function sig() {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return ctrl.signal;
}

async function fetchWeeklyReturn(ticker: string): Promise<number | null> {
  const cached = _cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value: number | null = null;
  try {
    const symbol = YAHOO_SYMBOLS[ticker] ?? ticker;
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`,
      { signal: sig() },
    );
    if (res.ok) {
      const json = await res.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
      const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
        .filter((c): c is number => typeof c === 'number' && isFinite(c) && c > 0);
      if (closes.length >= 2) {
        const first = closes[0];
        const last = closes[closes.length - 1];
        value = parseFloat((((last - first) / first) * 100).toFixed(2));
      }
    }
  } catch {
    /* graceful null — client falls back to simulation */
  }

  _cache.set(ticker, { value, expiresAt: Date.now() + CACHE_MS });
  return value;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'market-weekly-returns', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const raw = sanitizeString(url.searchParams.get('tickers') ?? '', 500) ?? '';
    const tickers = raw
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => TICKER_RE.test(t))
      .slice(0, MAX_TICKERS);

    if (tickers.length === 0) {
      return Response.json({ error: 'No valid tickers' }, { status: 400 });
    }

    const values = await Promise.all(tickers.map((t) => fetchWeeklyReturn(t)));
    const returns: Record<string, number | null> = {};
    tickers.forEach((t, i) => {
      returns[t] = values[i];
    });

    return Response.json(
      { ok: true, returns, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=600' } },
    );
  } catch (err: unknown) {
    return safeErrorResponse(err, 'market/weekly-returns GET');
  }
}
