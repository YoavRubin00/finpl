/**
 * SIM 19: סליידר הסיכון (Risk-Return Slider) — Module 4-19
 * 10 years of REAL historical annual returns (2014-2023).
 * Stocks: S&P 500 Total Return (with dividends reinvested).
 * Bonds: Bloomberg US Aggregate Bond Index.
 */

import type {
  YearReturn,
  RiskSliderConfig,
} from './riskSliderTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial investment amount (₪) */
const INITIAL_INVESTMENT = 100_000;

/** Simulation length */
const YEARS = 10;
export const DATA_START_YEAR = 2014;
export const DATA_END_YEAR = 2023;

// ── Real Annual Returns (2014-2023) ────────────────────────────────────

/** S&P 500 Total Return, 2014-2023 (dividends reinvested) */
const STOCK_RETURNS = [
  0.137,   // 2014: +13.7%
  0.014,   // 2015: +1.4%
  0.120,   // 2016: +12.0%
  0.218,   // 2017: +21.8%
  -0.044,  // 2018: -4.4%
  0.315,   // 2019: +31.5%
  0.184,   // 2020: +18.4%
  0.287,   // 2021: +28.7%
  -0.181,  // 2022: -18.1%
  0.263,   // 2023: +26.3%
];

/** Bloomberg US Aggregate Bond Index, 2014-2023 */
const BOND_RETURNS = [
  0.060,   // 2014: +6.0%
  0.005,   // 2015: +0.5%
  0.026,   // 2016: +2.6%
  0.035,   // 2017: +3.5%
  0.001,   // 2018: +0.1%
  0.087,   // 2019: +8.7%
  0.075,   // 2020: +7.5%
  -0.015,  // 2021: -1.5%
  -0.130,  // 2022: -13.0%
  0.055,   // 2023: +5.5%
];

// ── Pre-compute blended returns for 0%-100% stocks (every 10% step) ──

/**
 * Builds a 10-year history for a specific stock/bond allocation.
 * @param stockPct - Stock allocation as 0-100 integer
 */
function buildYearHistory(stockPct: number): YearReturn[] {
  const stockFrac = stockPct / 100;
  const bondFrac = 1 - stockFrac;
  let balance = INITIAL_INVESTMENT;

  return STOCK_RETURNS.map((stockRet, i) => {
    const bondRet = BOND_RETURNS[i];
    const mixedReturn = stockFrac * stockRet + bondFrac * bondRet;
    balance = balance * (1 + mixedReturn);

    return {
      year: i + 1,
      stockReturn: stockRet,
      bondReturn: bondRet,
      mixedReturn,
      balance: Math.round(balance),
    };
  });
}

/**
 * Pre-computed history for every 10% allocation step.
 * Index 0 = 0% stocks / 100% bonds
 * Index 10 = 100% stocks / 0% bonds
 */
const yearlyHistory: YearReturn[][] = Array.from({ length: 11 }, (_, i) =>
  buildYearHistory(i * 10),
);

// ── Config Export ───────────────────────────────────────────────────────

export const riskSliderConfig: RiskSliderConfig = {
  initialInvestment: INITIAL_INVESTMENT,
  years: YEARS,
  yearlyHistory,
};

/** Raw returns exposed for the hook to compute arbitrary allocations */
export const RAW_STOCK_RETURNS = STOCK_RETURNS;
export const RAW_BOND_RETURNS = BOND_RETURNS;
