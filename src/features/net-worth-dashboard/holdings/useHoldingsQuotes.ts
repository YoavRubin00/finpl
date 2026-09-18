/**
 * Live quotes for the holdings section — one react-query fetch for all
 * tracked tickers + the USD/ILS rate, over the EXISTING /api/trading/quote
 * endpoint (Yahoo chart proxy). No new server surface.
 */

import { useQuery } from '@tanstack/react-query';
import { getApiBase } from '../../../db/apiBase';

export interface LiveQuote {
  /** Latest price in the instrument's quote currency (see `currency`). */
  price: number;
  previousClose: number | null;
  /** 'USD' | 'ILS' | 'ILA' (TASE agorot) | other; null when Yahoo omits it —
   *  the holdings layer then assumes USD for non-.TA tickers. */
  currency: string | null;
}

export interface HoldingsQuotesData {
  /** Keyed by the HOLDING ticker (pre-override), missing = fetch failed. */
  quotes: Record<string, LiveQuote>;
  /** Live USD→ILS. Falls back to a rough constant when Yahoo hiccups. */
  usdIls: number;
  usdIlsLive: boolean;
}

/** Used only when the FX fetch itself fails — totals stay roughly right. */
export const FALLBACK_USD_ILS = 3.1;

/** Client-side Yahoo symbol fixes the server's map doesn't cover.
 *  (Server maps BTC/ETH/XAU/XAG; bare "SOL" would hit a NYSE stock.) */
const TICKER_OVERRIDES: Record<string, string> = { SOL: 'SOL-USD' };

async function fetchQuote(ticker: string): Promise<LiveQuote | null> {
  try {
    const yahoo = TICKER_OVERRIDES[ticker] ?? ticker;
    const res = await fetch(
      `${getApiBase()}/api/trading/quote?ticker=${encodeURIComponent(yahoo)}&timeframe=1D`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      price?: number;
      previousClose?: number | null;
      currency?: string | null;
    };
    if (json.ok !== true || typeof json.price !== 'number' || !(json.price > 0)) {
      return null;
    }
    return {
      price: json.price,
      previousClose:
        typeof json.previousClose === 'number' && json.previousClose > 0
          ? json.previousClose
          : null,
      currency: typeof json.currency === 'string' ? json.currency : null,
    };
  } catch {
    return null;
  }
}

export const holdingsQuotesQueryKey = (tickers: readonly string[]) =>
  ['holdings-quotes', [...tickers].sort().join(',')] as const;

export function useHoldingsQuotes(tickers: readonly string[]) {
  return useQuery<HoldingsQuotesData>({
    queryKey: holdingsQuotesQueryKey(tickers),
    queryFn: async () => {
      const [fxQuote, ...results] = await Promise.all([
        fetchQuote('USDILS=X'),
        ...tickers.map((t) => fetchQuote(t)),
      ]);
      const quotes: Record<string, LiveQuote> = {};
      tickers.forEach((t, i) => {
        const q = results[i];
        if (q) quotes[t] = q;
      });
      return {
        quotes,
        usdIls: fxQuote?.price ?? FALLBACK_USD_ILS,
        usdIlsLive: fxQuote !== null,
      };
    },
    enabled: tickers.length > 0,
    // Prices are "recent", not tick-by-tick — a learning app, not a terminal.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
