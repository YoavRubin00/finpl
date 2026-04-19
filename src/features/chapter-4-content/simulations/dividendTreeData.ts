/**
 * SIM 23: עץ הדיבידנדים (Dividend Tree), Module 4-23
 * Pre-computed 20-year paths for "Eat" (cash out dividends) vs "Plant" (DRIP reinvest).
 * Initial: ₪10,000, 3% dividend yield, 7% annual stock growth.
 */

import type {
  DividendYear,
  DividendTreeConfig,
} from './dividendTreeTypes';

// ── Constants ──────────────────────────────────────────────────────────

const INITIAL_INVESTMENT = 10_000;
const DIVIDEND_YIELD = 0.03;
const STOCK_GROWTH = 0.07;
const YEARS = 20;

// ── Path Builders ──────────────────────────────────────────────────────

/**
 * "Eat" path: dividends paid out each year, never reinvested.
 * Stock grows at stockGrowth rate, but dividends are only on the original share count.
 * shares stay constant → dividend = shares × currentPrice × yield
 * value = shares × currentPrice (shares never change)
 */
function buildEatPath(): DividendYear[] {
  const path: DividendYear[] = [];
  const initialShares = 1; // normalized to 1 share at initialPrice
  let currentPrice = INITIAL_INVESTMENT; // 1 share worth ₪10,000

  for (let year = 1; year <= YEARS; year++) {
    // Stock price grows
    currentPrice = currentPrice * (1 + STOCK_GROWTH);
    // Dividend based on current price (fixed share count)
    const dividend = initialShares * currentPrice * DIVIDEND_YIELD;
    const treeValue = initialShares * currentPrice;

    path.push({
      year,
      treeValue: Math.round(treeValue),
      dividendAmount: Math.round(dividend),
      reinvested: false,
    });
  }

  return path;
}

/**
 * "Plant" path (DRIP): dividends reinvested, buy more shares each year.
 * shares grow → dividend compounds → exponential growth.
 * Each year: dividend = shares × currentPrice × yield
 * New shares bought = dividend / currentPrice = shares × yield
 * So shares grow by factor (1 + yield) each year, price by (1 + growth).
 * value = shares × currentPrice
 */
function buildPlantPath(): DividendYear[] {
  const path: DividendYear[] = [];
  let shares = 1; // normalized to 1 share
  let currentPrice = INITIAL_INVESTMENT; // 1 share worth ₪10,000

  for (let year = 1; year <= YEARS; year++) {
    // Stock price grows
    currentPrice = currentPrice * (1 + STOCK_GROWTH);
    // Dividend based on ALL shares (growing count) × current price
    const dividend = shares * currentPrice * DIVIDEND_YIELD;
    // Reinvest: buy more shares at current price
    const newShares = dividend / currentPrice; // = shares × yield
    shares = shares + newShares;
    const treeValue = shares * currentPrice;

    path.push({
      year,
      treeValue: Math.round(treeValue),
      dividendAmount: Math.round(dividend),
      reinvested: true,
    });
  }

  return path;
}

// ── Pre-computed Paths ─────────────────────────────────────────────────

/** 20-year "eat" path, dividends cashed out each year */
export const EAT_PATH: DividendYear[] = buildEatPath();

/** 20-year "plant" path, dividends reinvested (DRIP) */
export const PLANT_PATH: DividendYear[] = buildPlantPath();

// ── Config Export ──────────────────────────────────────────────────────

export const dividendTreeConfig: DividendTreeConfig = {
  initialInvestment: INITIAL_INVESTMENT,
  dividendYield: DIVIDEND_YIELD,
  stockGrowth: STOCK_GROWTH,
  years: YEARS,
};
