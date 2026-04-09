/**
 * SIM 4-30: המרוץ נגד המדד (Index Race) — Module 4-30
 * 12 stocks with 10-year annual returns (based on real 2015-2025 data)
 * and S&P 500 benchmark for comparison.
 * Symbols match the trading hub (TRADABLE_ASSETS).
 */

import type { StockOption, IndexRaceConfig } from './indexRaceTypes';

// ── Constants ────────────────────────────────────────────────────────────────

export const INITIAL_INVESTMENT = 100_000;
export const PICK_COUNT = 5;
export const TOTAL_YEARS = 10;

// ── S&P 500 Benchmark (real 2015-2025, ~13% arithmetic avg) ─────────────────

const SP500_RETURNS: number[] = [
  // 2015   2016   2017   2018   2019   2020   2021   2022   2023   2024
  0.01,  0.12,  0.22, -0.04,  0.31,  0.18,  0.29, -0.18,  0.26,  0.25,
];

// ── Stock Options (12 stocks from trading hub + extras) ─────────────────────

const STOCK_OPTIONS: StockOption[] = [
  // ─── Winners (real ~2015-2025 approximate annual returns) ───
  {
    id: 'AAPL',
    name: 'Apple',
    emoji: '🍎',
    sector: 'טכנולוגיה',
    // 2015: -3%, 2016: +12%, 2017: +46%, 2018: -5%, 2019: +89%, 2020: +82%, 2021: +34%, 2022: -26%, 2023: +49%, 2024: +33%
    annualReturns: [-0.03, 0.12, 0.46, -0.05, 0.89, 0.82, 0.34, -0.26, 0.49, 0.33],
  },
  {
    id: 'NVDA',
    name: 'NVIDIA',
    emoji: '🟢',
    sector: 'שבבים',
    // 2015: +66%, 2016: +224%, 2017: +81%, 2018: -31%, 2019: +76%, 2020: +122%, 2021: +125%, 2022: -50%, 2023: +239%, 2024: +171%
    annualReturns: [0.66, 2.24, 0.81, -0.31, 0.76, 1.22, 1.25, -0.50, 2.39, 1.71],
  },
  {
    id: 'AMZN',
    name: 'Amazon',
    emoji: '📦',
    sector: 'מסחר וענן',
    // 2015: +118%, 2016: +11%, 2017: +56%, 2018: +28%, 2019: +23%, 2020: +76%, 2021: +2%, 2022: -50%, 2023: +81%, 2024: +44%
    annualReturns: [1.18, 0.11, 0.56, 0.28, 0.23, 0.76, 0.02, -0.50, 0.81, 0.44],
  },
  {
    id: 'MSFT',
    name: 'Microsoft',
    emoji: '🪟',
    sector: 'טכנולוגיה',
    // 2015: +23%, 2016: +15%, 2017: +40%, 2018: +21%, 2019: +57%, 2020: +43%, 2021: +52%, 2022: -28%, 2023: +58%, 2024: +13%
    annualReturns: [0.23, 0.15, 0.40, 0.21, 0.57, 0.43, 0.52, -0.28, 0.58, 0.13],
  },

  // ─── Average (stable, ~8-12% annual) ───
  {
    id: 'GOOGL',
    name: 'Alphabet',
    emoji: '🔍',
    sector: 'טכנולוגיה',
    // 2015: +47%, 2016: +2%, 2017: +33%, 2018: -1%, 2019: +28%, 2020: +31%, 2021: +65%, 2022: -39%, 2023: +58%, 2024: +36%
    annualReturns: [0.47, 0.02, 0.33, -0.01, 0.28, 0.31, 0.65, -0.39, 0.58, 0.36],
  },
  // ─── Indices & Israel ───
  {
    id: 'QQQ',
    name: 'Nasdaq 100',
    emoji: '💻',
    sector: 'מדד טכנולוגיה',
    // Realistic returns 2015-2024
    annualReturns: [0.09, 0.07, 0.33, 0.00, 0.39, 0.48, 0.27, -0.32, 0.55, 0.38],
  },
  {
    id: 'TA125.TA',
    name: 'תל אביב 125',
    emoji: '🇮🇱',
    sector: 'מדד ישראלי',
    // Realistic returns ~2015-2024
    annualReturns: [0.02, 0.04, 0.05, -0.03, 0.21, -0.04, 0.31, -0.08, 0.04, 0.20],
  },

  // ─── Crypto (Extreme Growth) ───
  {
    id: 'BTC',
    name: 'Bitcoin',
    emoji: '₿',
    sector: 'קריפטו',
    // 2015-2024 approx annual returns
    annualReturns: [0.35, 1.25, 13.18, -0.73, 0.95, 3.01, 0.60, -0.64, 1.55, 0.90],
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    emoji: 'Ξ',
    sector: 'קריפטו',
    // 2015-2024 approx annual returns (using 0 for 2015 partial year, then boom)
    annualReturns: [0.0, 7.5, 91.6, -0.82, -0.02, 4.70, 3.99, -0.67, 0.90, 0.50],
  },
  {
    id: 'XAU',
    name: 'זהב',
    emoji: '🥇',
    sector: 'סחורות',
    // 2015: -10%, 2016: +9%, 2017: +13%, 2018: -2%, 2019: +18%, 2020: +25%, 2021: -4%, 2022: +1%, 2023: +13%, 2024: +27%
    annualReturns: [-0.10, 0.09, 0.13, -0.02, 0.18, 0.25, -0.04, 0.01, 0.13, 0.27],
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
