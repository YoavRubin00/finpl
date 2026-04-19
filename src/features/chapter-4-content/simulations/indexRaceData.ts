/**
 * SIM 4-30: המרוץ נגד המדד (Index Race), Module 4-30
 * 10 stocks with annual returns based on REAL 2011-2020 historical data.
 * ‎S&P‎ 500 benchmark for comparison.
 * Symbols match the trading hub (TRADABLE_ASSETS).
 */

import type { StockOption, IndexRaceConfig } from './indexRaceTypes';

// ── Constants ────────────────────────────────────────────────────────────────

export const INITIAL_INVESTMENT = 100_000;
export const PICK_COUNT = 5;
export const TOTAL_YEARS = 10;
export const START_YEAR = 2011;
export const END_YEAR = 2020;

// ── ‎S&P‎ 500 Benchmark, REAL total-return (dividends reinvested) 2011-2020 ──
// 2011: +2.1% | 2012: +16.0% | 2013: +32.4% | 2014: +13.7% | 2015: +1.4%
// 2016: +12.0% | 2017: +21.8% | 2018: -4.4% | 2019: +31.5% | 2020: +18.4%

const SP500_RETURNS: number[] = [
  // 2011    2012   2013   2014    2015   2016   2017    2018   2019    2020
  0.021,  0.16,  0.324,  0.137,  0.014,  0.12,  0.218, -0.044,  0.315,  0.184,
];

// ── Stock Options, REAL 2011-2020 historical annual returns ────────────────

const STOCK_OPTIONS: StockOption[] = [
  // ─── Mega-cap Tech Winners ───
  {
    id: 'AAPL',
    name: 'Apple',
    emoji: '🍎',
    sector: 'טכנולוגיה',
    // 2011: +26%, 2012: +33%, 2013: +8%, 2014: +41%, 2015: -3%, 2016: +12%, 2017: +46%, 2018: -5%, 2019: +89%, 2020: +82%
    annualReturns: [0.26, 0.33, 0.08, 0.41, -0.03, 0.12, 0.46, -0.05, 0.89, 0.82],
  },
  {
    id: 'NVDA',
    name: 'NVIDIA',
    emoji: '🟢',
    sector: 'שבבים',
    // 2011: -11%, 2012: -8%, 2013: +9%, 2014: +27%, 2015: +66%, 2016: +224%, 2017: +81%, 2018: -31%, 2019: +76%, 2020: +122%
    annualReturns: [-0.11, -0.08, 0.09, 0.27, 0.66, 2.24, 0.81, -0.31, 0.76, 1.22],
  },
  {
    id: 'AMZN',
    name: 'Amazon',
    emoji: '📦',
    sector: 'מסחר וענן',
    // 2011: -4%, 2012: +45%, 2013: +59%, 2014: -22%, 2015: +118%, 2016: +11%, 2017: +56%, 2018: +28%, 2019: +23%, 2020: +76%
    annualReturns: [-0.04, 0.45, 0.59, -0.22, 1.18, 0.11, 0.56, 0.28, 0.23, 0.76],
  },
  {
    id: 'MSFT',
    name: 'Microsoft',
    emoji: '🪟',
    sector: 'טכנולוגיה',
    // 2011: -5%, 2012: +3%, 2013: +44%, 2014: +28%, 2015: +23%, 2016: +15%, 2017: +40%, 2018: +21%, 2019: +57%, 2020: +43%
    annualReturns: [-0.05, 0.03, 0.44, 0.28, 0.23, 0.15, 0.40, 0.21, 0.57, 0.43],
  },
  {
    id: 'GOOGL',
    name: 'Alphabet',
    emoji: '🔍',
    sector: 'טכנולוגיה',
    // 2011: +9%, 2012: +10%, 2013: +58%, 2014: -6%, 2015: +47%, 2016: +2%, 2017: +33%, 2018: -1%, 2019: +28%, 2020: +31%
    annualReturns: [0.09, 0.10, 0.58, -0.06, 0.47, 0.02, 0.33, -0.01, 0.28, 0.31],
  },

  // ─── Indices ───
  {
    id: 'QQQ',
    name: 'Nasdaq 100',
    emoji: '💻',
    sector: 'מדד טכנולוגיה',
    // 2011: +2%, 2012: +18%, 2013: +37%, 2014: +19%, 2015: +9%, 2016: +7%, 2017: +33%, 2018: 0%, 2019: +39%, 2020: +48%
    annualReturns: [0.02, 0.18, 0.37, 0.19, 0.09, 0.07, 0.33, 0.00, 0.39, 0.48],
  },
  {
    id: 'TA125.TA',
    name: 'תל אביב 125',
    emoji: '🇮🇱',
    sector: 'מדד ישראלי',
    // 2011: -20%, 2012: +7%, 2013: +15%, 2014: +10%, 2015: +2%, 2016: +4%, 2017: +5%, 2018: -3%, 2019: +21%, 2020: -4%
    annualReturns: [-0.20, 0.07, 0.15, 0.10, 0.02, 0.04, 0.05, -0.03, 0.21, -0.04],
  },

  // ─── Crypto (Extreme Volatility) ───
  {
    id: 'BTC',
    name: 'Bitcoin',
    emoji: '₿',
    sector: 'קריפטו',
    // 2011: +1473%, 2012: +186%, 2013: +5428%, 2014: -58%, 2015: +35%, 2016: +125%, 2017: +1318%, 2018: -73%, 2019: +95%, 2020: +301%
    annualReturns: [14.73, 1.86, 54.28, -0.58, 0.35, 1.25, 13.18, -0.73, 0.95, 3.01],
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    emoji: 'Ξ',
    sector: 'קריפטו',
    // ETH launched 2015 mid-year. 2011-2014: 0 (not yet existed).
    // 2015: +27% (partial year, Jul-Dec), 2016: +750%, 2017: +9162%, 2018: -82%, 2019: -2%, 2020: +470%
    annualReturns: [0, 0, 0, 0, 0.27, 7.50, 91.60, -0.82, -0.02, 4.70],
  },

  // ─── Safe Haven ───
  {
    id: 'XAU',
    name: 'זהב',
    emoji: '🥇',
    sector: 'סחורות',
    // 2011: +10%, 2012: +7%, 2013: -28%, 2014: -2%, 2015: -10%, 2016: +9%, 2017: +13%, 2018: -2%, 2019: +18%, 2020: +25%
    annualReturns: [0.10, 0.07, -0.28, -0.02, -0.10, 0.09, 0.13, -0.02, 0.18, 0.25],
  },
];

// ── Config Export ────────────────────────────────────────────────────────────

export const indexRaceConfig: IndexRaceConfig = {
  stockOptions: STOCK_OPTIONS,
  pickCount: PICK_COUNT,
  years: TOTAL_YEARS,
  indexReturns: SP500_RETURNS,
  initialInvestment: INITIAL_INVESTMENT,
};
