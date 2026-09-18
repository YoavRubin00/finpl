/**
 * Live stock holdings — types, pickable universe, and the learning tie-in.
 *
 * This is FinPlay's answer to tracker apps (הבית הפיננסי et al.): we track the
 * user's REAL holdings with live prices, but every portfolio state maps back
 * to a lesson — the tracker teaches, not just displays. Competitor apps can't
 * copy this because they have no curriculum behind the dashboard.
 *
 * Tracking only — never connected to a brokerage account, never advice.
 */

import { TICKER_CATALOG, type CatalogEntry } from '../../breaking-news/tickerCatalog';
import { getCompletedModulesSync } from '../../chapter-1-content/useProgress';

export interface Holding {
  id: string;
  /** Catalog ticker (Yahoo format for US listings; crypto as BTC/ETH/SOL). */
  ticker: string;
  /** Hebrew display name, denormalized from the catalog at add-time. */
  nameHe: string;
  /** Share/coin count — fractional allowed (0.5 of NVDA is real life). */
  units: number;
  /** Average buy price in the DISPLAY currency of the instrument: shekels for
   *  TASE (.TA) tickers, USD for everything else. Optional — without it we
   *  skip P&L, no guilt. (Was `avgBuyPriceUsd` in store v1 — migrated.) */
  avgBuyPrice?: number;
  createdAt: number;
}

/**
 * The pickable universe = the breaking-news catalog minus index rows that
 * aren't directly holdable as "units" (TA125.TA is points, not shares —
 * Yahoo quotes TASE in index points / agorot which would corrupt ₪ totals).
 */
const UNHOLDABLE = new Set<string>(['TA125.TA']);

export const HOLDABLE_CATALOG: readonly CatalogEntry[] = TICKER_CATALOG.filter(
  (e) => !UNHOLDABLE.has(e.ticker),
);

export function findHoldable(ticker: string): CatalogEntry | undefined {
  return HOLDABLE_CATALOG.find((e) => e.ticker === ticker);
}

/** True for Tel-Aviv listed tickers (Yahoo `.TA` suffix). */
export function isTaseTicker(ticker: string): boolean {
  return ticker.endsWith('.TA');
}

/**
 * Convert ONE unit's quoted price to shekels.
 *   'ILA' → agorot (Yahoo's TASE convention) → ÷100
 *   'ILS' → already shekels
 *   otherwise → treated as USD × live rate
 * When Yahoo omits the currency, `.TA` tickers are assumed agorot (that is
 * what every TASE equity returns) and everything else USD.
 */
export function unitPriceToIls(
  price: number,
  currency: string | null,
  ticker: string,
  usdIls: number,
): number {
  const cur = currency ?? (isTaseTicker(ticker) ? 'ILA' : 'USD');
  if (cur === 'ILA') return price / 100;
  if (cur === 'ILS') return price;
  return price * usdIls;
}

/** Index ETFs — used by the lesson recommender ("no ETF in portfolio" rule). */
const ETF_TICKERS = new Set<string>(['SPY', 'QQQ', 'VTI']);

export function isEtf(ticker: string): boolean {
  return ETF_TICKERS.has(ticker);
}

// ── Learning tie-in ─────────────────────────────────────────────────────────

export interface PortfolioLessonReco {
  moduleId: string;
  /** Card headline — system voice, plural (BRAND.md). */
  title: string;
  /** One-liner under the headline. */
  body: string;
  /** Analytics discriminator for which rule fired. */
  reason: 'concentration' | 'no_etf' | 'tase' | 'know_your_holdings';
}

interface WeightedHolding {
  holding: Holding;
  /** Share of total portfolio value, 0..1. Live value when available. */
  weight: number;
}

/**
 * Pick ONE next lesson from the real portfolio's shape. Priority order:
 *   1. >50% of the portfolio in a single holding → diversification (mod-4-24)
 *   2. all single names, no index ETF          → ETFs (mod-4-21)
 *   3. otherwise                                → financial reports (mod-4-25)
 * Modules the user already completed are skipped down the chain; when the
 * whole chain is done the card disappears — never nag a graduate.
 */
export function recommendPortfolioLesson(
  weighted: readonly WeightedHolding[],
): PortfolioLessonReco | null {
  if (weighted.length === 0) return null;
  const completed = new Set(getCompletedModulesSync('ch-4'));

  const chain: PortfolioLessonReco[] = [];

  const topWeight = Math.max(...weighted.map((w) => w.weight));
  if (weighted.length >= 2 && topWeight > 0.5) {
    chain.push({
      moduleId: 'mod-4-24',
      title: 'רוב התיק על נייר אחד',
      body: 'ככה משקיעים מפזרים סיכון בלי לוותר על תשואה.',
      reason: 'concentration',
    });
  }
  if (!weighted.some((w) => isEtf(w.holding.ticker))) {
    chain.push({
      moduleId: 'mod-4-21',
      title: 'אין תעודת סל בתיק',
      body: 'הכלי שרוב המשקיעים הגדולים מתחילים ממנו.',
      reason: 'no_etf',
    });
  }
  // Holds Tel-Aviv shares → the TASE module (agorot, Mon–Fri, banks' weight).
  if (weighted.some((w) => isTaseTicker(w.holding.ticker))) {
    chain.push({
      moduleId: 'mod-4-34',
      title: 'יש לכם מניות מתל אביב',
      body: 'אגורות, שעות מסחר, ולמה הבנקים מזיזים את המדד.',
      reason: 'tase',
    });
  }
  chain.push({
    moduleId: 'mod-4-25',
    title: 'להכיר את מה שמחזיקים',
    body: 'איך קוראים דוח כספי של חברה שנמצאת אצלכם בתיק.',
    reason: 'know_your_holdings',
  });

  return chain.find((r) => !completed.has(r.moduleId)) ?? null;
}
