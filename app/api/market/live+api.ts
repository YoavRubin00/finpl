/**
 * GET /api/market/live
 *
 * Returns live market rates (USD/ILS, BTC, TA-125, interest rate)
 * and up to 5 financial news headlines from Globes RSS.
 * Server-side 10-minute in-memory cache.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import type { RateItem, NewsItem, LiveMarketData } from '../../../src/features/finfeed/liveMarketTypes';

const CACHE_MS = 10 * 60 * 1000;
let _cache: { data: LiveMarketData; expiresAt: number } | null = null;

const TIMEOUT_MS = 6_000;
const sig = () => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return ctrl.signal;
};

// ── USD / ILS ──────────────────────────────────────────────────────────────
async function fetchUsdIls(): Promise<RateItem> {
  // Primary: open.er-api.com (no auth)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: sig() });
    if (res.ok) {
      const json = await res.json() as { rates?: Record<string, number> };
      const rate = Number(json?.rates?.ILS);
      if (isFinite(rate) && rate > 1 && rate < 10) {
        return { value: `₪${rate.toFixed(2)}`, numericValue: rate, changePct: 0, direction: 'stable', label: 'דולר / שקל', symbol: '$' };
      }
    }
  } catch { /* fall through */ }

  // Secondary: exchangerate.host
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=ILS', { signal: sig() });
    if (res.ok) {
      const json = await res.json() as { rates?: Record<string, number> };
      const rate = Number(json?.rates?.ILS);
      if (isFinite(rate) && rate > 1 && rate < 10) {
        return { value: `₪${rate.toFixed(2)}`, numericValue: rate, changePct: 0, direction: 'stable', label: 'דולר / שקל', symbol: '$' };
      }
    }
  } catch { /* fall through */ }

  return { value: '₪3.65', numericValue: 3.65, changePct: 0, direction: 'stable', label: 'דולר / שקל', symbol: '$' };
}

// ── Bitcoin / USD (Yahoo Finance, no key needed) ───────────────────────────
async function fetchBtc(): Promise<RateItem> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=2d',
      { signal: sig() },
    );
    if (res.ok) {
      const json = await res.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> } };
      const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const latest = closes[closes.length - 1];
      const prev = closes.length >= 2 ? closes[closes.length - 2] : latest;
      if (isFinite(latest) && latest > 1000) {
        const changePct = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
        const direction: RateItem['direction'] = changePct > 0.1 ? 'up' : changePct < -0.1 ? 'down' : 'stable';
        return {
          value: `$${Math.round(latest).toLocaleString('en-US')}`,
          numericValue: latest,
          changePct: parseFloat(changePct.toFixed(2)),
          direction,
          label: 'ביטקוין',
          symbol: '₿',
        };
      }
    }
  } catch { /* fall through */ }
  return { value: '$65,000', numericValue: 65000, changePct: 0, direction: 'stable', label: 'ביטקוין', symbol: '₿' };
}

// ── TA-125 (Yahoo Finance) ─────────────────────────────────────────────────
async function fetchTA125(): Promise<RateItem> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ETA125.TA?interval=1d&range=2d',
      { signal: sig() },
    );
    if (res.ok) {
      const json = await res.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> } };
      const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const latest = closes[closes.length - 1];
      const prev = closes.length >= 2 ? closes[closes.length - 2] : latest;
      if (isFinite(latest)) {
        const changePct = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
        const direction: RateItem['direction'] = changePct > 0.1 ? 'up' : changePct < -0.1 ? 'down' : 'stable';
        return {
          value: Math.round(latest).toLocaleString('en-US'),
          numericValue: latest,
          changePct: parseFloat(changePct.toFixed(2)),
          direction,
          label: 'ת"א 125',
          symbol: '📈',
        };
      }
    }
  } catch { /* fall through */ }
  return { value: '2,100', numericValue: 2100, changePct: 0, direction: 'stable', label: 'ת"א 125', symbol: '📈' };
}

// ── Bank of Israel interest rate ────────────────────────────────────────────
async function fetchInterestRate(): Promise<RateItem> {
  try {
    const res = await fetch(
      'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI/IR/1.0?lastNObservations=2',
      { headers: { Accept: 'application/json' }, signal: sig() },
    );
    if (res.ok) {
      const json = await res.json() as { data?: { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, number[]> }> }> } };
      const series = json?.data?.dataSets?.[0]?.series;
      if (series) {
        const key = Object.keys(series)[0];
        const obs = series[key]?.observations;
        if (obs) {
          const sorted = Object.keys(obs).sort((a, b) => Number(b) - Number(a));
          const latest = Number(obs[sorted[0]]?.[0]);
          const prev = sorted.length > 1 ? Number(obs[sorted[1]]?.[0]) : latest;
          if (isFinite(latest)) {
            const direction: RateItem['direction'] = latest > prev ? 'up' : latest < prev ? 'down' : 'stable';
            return { value: `${latest.toFixed(2)}%`, numericValue: latest, changePct: 0, direction, label: 'ריבית בנק ישראל', symbol: '🏦' };
          }
        }
      }
    }
  } catch { /* fall through */ }
  return { value: '4.50%', numericValue: 4.5, changePct: 0, direction: 'stable', label: 'ריבית בנק ישראל', symbol: '🏦' };
}

// ── Globes RSS — parse up to 5 raw items ───────────────────────────────────
interface RawNewsItem {
  originalHeadline: string;
  source: string;
  pubDate: string;
  link: string;
}

async function fetchRawNews(): Promise<RawNewsItem[]> {
  const GLOBES_RSS = 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585';
  try {
    const res = await fetch(GLOBES_RSS, { headers: { Accept: 'application/xml' }, signal: sig() });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: RawNewsItem[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;

    while ((m = itemRe.exec(xml)) !== null && items.length < 5) {
      const block = m[1];
      const clean = (s: string) =>
        s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/<[^>]*>/g, '').trim();

      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1];
      const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];

      if (!title) continue;
      items.push({
        originalHeadline: clean(title),
        source: 'גלובס',
        pubDate: pub?.trim() ?? '',
        link: link?.trim() ?? '',
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ── Rephrase headlines with Gemini to avoid copyright issues ───────────────
async function rephraseHeadlines(raw: RawNewsItem[]): Promise<NewsItem[]> {
  if (raw.length === 0) return [];

  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
  if (!GEMINI_API_KEY) {
    // No key — return headlines as-is (degraded mode)
    return raw.map((r) => ({ headline: r.originalHeadline, summary: '', source: r.source, pubDate: r.pubDate, link: r.link }));
  }

  const originals = raw.map((r, i) => `${i + 1}. ${r.originalHeadline}`).join('\n');
  const prompt = `אתה עורך פיננסי. נסח מחדש את כותרות החדשות הבאות בעברית בניסוח שלך — שמור על המשמעות המדויקת אבל אל תעתיק את הניסוח המקורי כלל. החזר JSON בלבד: מערך של מחרוזות, ללא הסברים נוספים.\n\nכותרות:\n${originals}`;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const rephrased = JSON.parse(cleaned) as string[];
    return raw.map((r, i) => ({
      headline: rephrased[i] ?? r.originalHeadline,
      summary: '',
      source: r.source,
      pubDate: r.pubDate,
      link: r.link,
    }));
  } catch {
    // Fallback to originals if AI fails
    return raw.map((r) => ({ headline: r.originalHeadline, summary: '', source: r.source, pubDate: r.pubDate, link: r.link }));
  }
}

async function fetchNews(): Promise<NewsItem[]> {
  const raw = await fetchRawNews();
  return rephraseHeadlines(raw);
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, 'market/live', { limit: 30, windowSec: 60 });
  if (limited) return limited;

  if (_cache && _cache.expiresAt > Date.now()) {
    return Response.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=600', 'X-Cache': 'HIT' },
    });
  }

  try {
    const [usdIls, btc, ta125, interest, news] = await Promise.all([
      fetchUsdIls(),
      fetchBtc(),
      fetchTA125(),
      fetchInterestRate(),
      fetchNews(),
    ]);

    const data: LiveMarketData = {
      rates: [usdIls, btc, ta125, interest],
      news,
      fetchedAt: new Date().toISOString(),
    };

    _cache = { data, expiresAt: Date.now() + CACHE_MS };

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=600', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return safeErrorResponse(err, 'market/live');
  }
}