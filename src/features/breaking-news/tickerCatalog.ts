/**
 * Static catalog of tickers that show up in the picker's autocomplete.
 * Covers the headline stocks Gen-Z investors actually search for + the
 * Israeli equities that the existing `marketApiService` already supports.
 *
 * The Yahoo ticker format is what `marketApiService.fetchLatestPrice`
 * expects — TASE symbols use the `.TA` suffix.
 *
 * Adding a ticker here makes it pickable in the UI but the cron only
 * processes tickers actually being tracked by at least one user, so the
 * catalog can grow freely without server cost.
 */

export interface CatalogEntry {
  /** The exact symbol passed to Tavily/price API. */
  ticker: string;
  /** English-language name shown when the user searches in English. */
  nameEn: string;
  /** Hebrew name for users searching in Hebrew (free-text autocomplete). */
  nameHe: string;
  exchange: 'NASDAQ' | 'NYSE' | 'TASE' | 'CRYPTO';
  /** Optional category for visual grouping in the picker. */
  category: 'tech' | 'growth' | 'energy' | 'israel' | 'crypto' | 'index';
}

export const TICKER_CATALOG: readonly CatalogEntry[] = [
  // Tech mega-caps
  { ticker: 'AAPL', nameEn: 'Apple', nameHe: 'אפל', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'MSFT', nameEn: 'Microsoft', nameHe: 'מיקרוסופט', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'GOOGL', nameEn: 'Google (Alphabet)', nameHe: 'גוגל', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'AMZN', nameEn: 'Amazon', nameHe: 'אמזון', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'META', nameEn: 'Meta (Facebook)', nameHe: 'מטא', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'NVDA', nameEn: 'Nvidia', nameHe: 'אנבידיה', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'TSLA', nameEn: 'Tesla', nameHe: 'טסלה', exchange: 'NASDAQ', category: 'growth' },
  { ticker: 'NFLX', nameEn: 'Netflix', nameHe: 'נטפליקס', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'AMD', nameEn: 'AMD', nameHe: 'AMD', exchange: 'NASDAQ', category: 'tech' },
  { ticker: 'INTC', nameEn: 'Intel', nameHe: 'אינטל', exchange: 'NASDAQ', category: 'tech' },

  // Growth / meme
  { ticker: 'PLTR', nameEn: 'Palantir', nameHe: 'פאלנטיר', exchange: 'NASDAQ', category: 'growth' },
  { ticker: 'GME', nameEn: 'GameStop', nameHe: 'גיים סטופ', exchange: 'NYSE', category: 'growth' },
  { ticker: 'AMC', nameEn: 'AMC Entertainment', nameHe: 'AMC', exchange: 'NYSE', category: 'growth' },
  { ticker: 'COIN', nameEn: 'Coinbase', nameHe: 'קוינבייס', exchange: 'NASDAQ', category: 'growth' },
  { ticker: 'RIVN', nameEn: 'Rivian', nameHe: 'ריביאן', exchange: 'NASDAQ', category: 'growth' },
  { ticker: 'SHOP', nameEn: 'Shopify', nameHe: 'שופיפיי', exchange: 'NYSE', category: 'growth' },
  { ticker: 'SOFI', nameEn: 'SoFi', nameHe: 'SoFi', exchange: 'NASDAQ', category: 'growth' },

  // Index ETFs
  { ticker: 'SPY', nameEn: 'S&P 500 ETF', nameHe: 'S&P 500', exchange: 'NYSE', category: 'index' },
  { ticker: 'QQQ', nameEn: 'NASDAQ 100 ETF', nameHe: 'נאסד״ק 100', exchange: 'NASDAQ', category: 'index' },
  { ticker: 'VTI', nameEn: 'Total Market ETF', nameHe: 'שוק כולל', exchange: 'NYSE', category: 'index' },

  // Energy
  { ticker: 'XOM', nameEn: 'ExxonMobil', nameHe: 'אקסון מוביל', exchange: 'NYSE', category: 'energy' },
  { ticker: 'CVX', nameEn: 'Chevron', nameHe: 'שברון', exchange: 'NYSE', category: 'energy' },

  // Israeli equities (TASE — Yahoo suffix `.TA`)
  { ticker: 'TA125.TA', nameEn: 'TA-125 Index', nameHe: 'ת״א 125', exchange: 'TASE', category: 'israel' },
  { ticker: 'TEVA', nameEn: 'Teva Pharmaceutical', nameHe: 'טבע', exchange: 'NYSE', category: 'israel' },
  { ticker: 'CHKP', nameEn: 'Check Point Software', nameHe: 'צ׳ק פוינט', exchange: 'NASDAQ', category: 'israel' },
  { ticker: 'NICE', nameEn: 'NICE Ltd.', nameHe: 'נייס', exchange: 'NASDAQ', category: 'israel' },
  { ticker: 'WIX', nameEn: 'Wix.com', nameHe: 'וויקס', exchange: 'NASDAQ', category: 'israel' },
  { ticker: 'MNDY', nameEn: 'monday.com', nameHe: 'מאנדיי', exchange: 'NASDAQ', category: 'israel' },
  { ticker: 'GLBE', nameEn: 'Global-e', nameHe: 'גלובל-e', exchange: 'NASDAQ', category: 'israel' },

  // Crypto (handled as tickers by the news layer even though prices live elsewhere)
  { ticker: 'BTC', nameEn: 'Bitcoin', nameHe: 'ביטקוין', exchange: 'CRYPTO', category: 'crypto' },
  { ticker: 'ETH', nameEn: 'Ethereum', nameHe: 'את׳ריום', exchange: 'CRYPTO', category: 'crypto' },
  { ticker: 'SOL', nameEn: 'Solana', nameHe: 'סולנה', exchange: 'CRYPTO', category: 'crypto' },
];

/** Case-insensitive substring match against ticker / English name / Hebrew name.
 *  Returns up to `limit` results ranked by where the match landed (ticker > nameEn > nameHe). */
export function searchCatalog(query: string, limit = 8): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return TICKER_CATALOG.slice(0, limit);

  const scored: Array<[CatalogEntry, number]> = [];
  for (const entry of TICKER_CATALOG) {
    const t = entry.ticker.toLowerCase();
    const e = entry.nameEn.toLowerCase();
    const h = entry.nameHe; // already in Hebrew, no lower needed
    if (t === q) scored.push([entry, 0]);
    else if (t.startsWith(q)) scored.push([entry, 1]);
    else if (e.startsWith(q)) scored.push([entry, 2]);
    else if (h.startsWith(query.trim())) scored.push([entry, 2]);
    else if (t.includes(q)) scored.push([entry, 3]);
    else if (e.includes(q)) scored.push([entry, 4]);
    else if (h.includes(query.trim())) scored.push([entry, 4]);
  }
  scored.sort((a, b) => a[1] - b[1]);
  return scored.slice(0, limit).map(([e]) => e);
}

/** Look up an entry by ticker — used to render the name beside the symbol. */
export function findCatalogEntry(ticker: string): CatalogEntry | undefined {
  return TICKER_CATALOG.find((e) => e.ticker === ticker);
}
