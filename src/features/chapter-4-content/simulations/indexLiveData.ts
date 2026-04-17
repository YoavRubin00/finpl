/**
 * SIM 20: מדד לייב (Index Live — ‎S&P‎ 500 Time Machine) — Module 4-20
 * Simplified ‎S&P‎ 500 annual returns 1980-2024 (approximate real data).
 * Includes all major crashes and booms.
 */

import type { SP500Year, IndexLiveConfig } from './indexLiveTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial investment amount (₪) */
const INITIAL_INVESTMENT = 10_000;

/** Slider range: start years player can choose */
const START_YEAR_RANGE: [number, number] = [1980, 2025];

// ── Approximate ‎S&P‎ 500 Annual Returns 1980-2025 ─────────────────────
// Based on real historical data (price appreciation, excluding dividends).

const ANNUAL_RETURNS: Record<number, number> = {
  // 1980s: volatile but strong overall
  1980: 0.26,   // Post-recession recovery
  1981: -0.10,  // Recession begins
  1982: 0.15,   // Recovery starts
  1983: 0.17,   // Strong rebound
  1984: 0.01,   // Flat year
  1985: 0.26,   // Bull market begins
  1986: 0.15,   // Continued growth
  1987: 0.02,   // Black Monday crash but recovered by year-end
  1988: 0.12,   // Recovery
  1989: 0.27,   // Strong finish to decade

  // 1990s: dot-com boom era
  1990: -0.07,  // Gulf War slowdown
  1991: 0.26,   // Post-war recovery
  1992: 0.04,   // Modest growth
  1993: 0.07,   // Steady
  1994: -0.02,  // Rate hike pain
  1995: 0.34,   // Boom begins
  1996: 0.20,   // Tech euphoria
  1997: 0.31,   // Incredible year
  1998: 0.27,   // Despite LTCM crisis
  1999: 0.20,   // Dot-com peak

  // 2000s: lost decade — dot-com bust + financial crisis
  2000: -0.10,  // Dot-com burst begins
  2001: -0.13,  // 9/11 + continued bust
  2002: -0.23,  // Bottom of dot-com crash
  2003: 0.26,   // Recovery begins
  2004: 0.09,   // Modest growth
  2005: 0.03,   // Slow year
  2006: 0.14,   // Pre-crisis boom
  2007: 0.04,   // Calm before the storm
  2008: -0.38,  // Global Financial Crisis
  2009: 0.23,   // Sharp recovery begins

  // 2010s: longest bull market in history
  2010: 0.13,   // Continued recovery
  2011: 0.00,   // Flat (EU debt crisis)
  2012: 0.13,   // Steady growth
  2013: 0.30,   // Stellar year
  2014: 0.11,   // Solid
  2015: -0.01,  // Essentially flat
  2016: 0.10,   // Election year rally
  2017: 0.19,   // Tax reform optimism
  2018: -0.06,  // Rate hike correction
  2019: 0.29,   // Great rebound

  // 2020s: pandemic + recovery + AI boom
  2020: 0.16,   // COVID crash in March, but full-year recovery +16%
  2021: 0.27,   // Stimulus-fueled boom
  2022: -0.19,  // Inflation + rate hikes
  2023: 0.24,   // AI-driven rally
  2024: 0.23,   // Continued AI momentum
  2025: 0.02,   // YTD through Q1 (tariff uncertainty, mixed signals)
};

// ── Build SP500Year[] with cumulative data ────────────────────────────

function buildYearData(): SP500Year[] {
  const years = Object.keys(ANNUAL_RETURNS)
    .map(Number)
    .sort((a, b) => a - b);

  // Start with a normalized price of 100
  let price = 100;
  let cumulative = 0;

  return years.map((year) => {
    const annualReturn = ANNUAL_RETURNS[year];
    price = price * (1 + annualReturn);
    cumulative = (price / 100) - 1; // cumulative from 1980 start

    return {
      year,
      price: Math.round(price * 100) / 100,
      annualReturn,
      cumulativeReturn: Math.round(cumulative * 10000) / 10000,
    };
  });
}

const YEAR_DATA = buildYearData();

// ── Config Export ───────────────────────────────────────────────────────

export const indexLiveConfig: IndexLiveConfig = {
  initialInvestment: INITIAL_INVESTMENT,
  yearData: YEAR_DATA,
  startYearRange: START_YEAR_RANGE,
};

/** Raw annual returns exposed for the hook to compute from any start year */
export const SP500_ANNUAL_RETURNS = ANNUAL_RETURNS;

/** Pre-built year data array */
export const SP500_YEAR_DATA = YEAR_DATA;
