/**
 * SIM 5-30: סימולטור הקריפטו (Crypto Sim) — Module 5-30
 * 4-year crypto allocation data based on real 2022-2025 returns.
 * BTC, ETH, and cash vs S&P 500 benchmark.
 */

import type { CryptoAsset, CryptoYear, CryptoSimConfig, CryptoAllocation } from './cryptoSimTypes';

// ── Constants ────────────────────────────────────────────────────────────────

export const INITIAL_AMOUNT = 10_000;
export const TOTAL_YEARS = 4;

// ── Assets ───────────────────────────────────────────────────────────────────

const CRYPTO_ASSETS: CryptoAsset[] = [
  { id: 'btc', name: 'Bitcoin', emoji: '₿' },
  { id: 'eth', name: 'Ethereum', emoji: 'Ξ' },
  { id: 'cash', name: 'מזומן', emoji: '💵' },
];

// ── Year Data (real 2022-2025) ──────────────────────────────────────────────

const YEAR_DATA: CryptoYear[] = [
  {
    year: 1, // 2022 — crypto winter
    btcReturn: -0.64,   // BTC fell from ~47K to ~16.5K (-64%)
    ethReturn: -0.67,   // ETH fell from ~3.7K to ~1.2K (-67%)
    sp500Return: -0.18, // S&P 500 -18%
  },
  {
    year: 2, // 2023 — recovery
    btcReturn: 1.55,    // BTC rose from ~16.5K to ~42K (+155%)
    ethReturn: 0.90,    // ETH rose from ~1.2K to ~2.3K (+90%)
    sp500Return: 0.26,  // S&P 500 +26%
  },
  {
    year: 3, // 2024 — BTC ETF rally
    btcReturn: 1.20,    // BTC rose from ~42K to ~93K (+120%)
    ethReturn: 0.47,    // ETH rose from ~2.3K to ~3.4K (+47%)
    sp500Return: 0.25,  // S&P 500 +25%
  },
  {
    year: 4, // 2025 (Q1) — consolidation
    btcReturn: -0.10,   // BTC ~93K to ~84K (-10%)
    ethReturn: -0.15,   // ETH ~3.4K to ~2.9K (-15%)
    sp500Return: -0.04, // S&P 500 -4% (tariff concerns)
  },
];

// ── Default Allocation ───────────────────────────────────────────────────────

export const DEFAULT_ALLOCATION: CryptoAllocation = {
  btcPercent: 50,
  ethPercent: 30,
  cashPercent: 20,
};

// ── Config Export ────────────────────────────────────────────────────────────

export const cryptoSimConfig: CryptoSimConfig = {
  initialAmount: INITIAL_AMOUNT,
  yearData: YEAR_DATA,
  assets: CRYPTO_ASSETS,
};
