/**
 * SIM 19: סליידר הסיכון (Risk-Return Slider) — Module 4-19
 * 10 years of market data inspired by real returns (2014-2024).
 * Pre-computed blended returns for every 10% allocation step.
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

// ── Annual Returns (inspired by 2014-2024 real market data) ─────────

/** Stock annual returns: range from -30% to +30% */
const STOCK_RETURNS = [
  0.12,   // Year 1: solid year
  0.01,   // Year 2: flat
  -0.02,  // Year 3: slight dip
  0.10,   // Year 4: recovery
  0.20,   // Year 5: boom
  -0.30,  // Year 6: crash (2008-style)
  0.28,   // Year 7: sharp recovery
  0.18,   // Year 8: strong growth
  -0.05,  // Year 9: mild correction
  0.25,   // Year 10: great finish
];

/** Bond annual returns: range from -5% to +8% */
const BOND_RETURNS = [
  0.04,   // Year 1
  0.05,   // Year 2
  0.06,   // Year 3: bonds rise when stocks dip
  0.03,   // Year 4
  0.02,   // Year 5: bonds lag in boom
  0.08,   // Year 6: flight to safety
  -0.02,  // Year 7: bonds drop during recovery
  -0.05,  // Year 8: rate hike pain
  0.06,   // Year 9: bonds recover
  0.03,   // Year 10
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
