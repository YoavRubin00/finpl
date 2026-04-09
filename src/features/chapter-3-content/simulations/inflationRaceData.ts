/** Product catalog and configuration for the "Inflation Race" simulation (Module 3-15) */

import type { Product, InflationRaceConfig } from './inflationRaceTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Annual inflation rate (3.5%) */
const INFLATION_RATE = 0.035;

/** Annual investment return rate (8%) */
const INVESTMENT_RETURN = 0.08;

/** Starting money in checking account (₪) */
const INITIAL_MONEY = 10_000;

// ── Products (2024 base prices) ────────────────────────────────────────

const products: Product[] = [
  {
    id: 'coffee',
    name: 'קפה הפוך',
    emoji: '☕',
    basePrice: 15,
    category: 'food',
  },
  {
    id: 'shawarma',
    name: 'מנת שווארמה',
    emoji: '🥙',
    basePrice: 55,
    category: 'food',
  },
  {
    id: 'groceries',
    name: 'מכולת שבועית',
    emoji: '🛒',
    basePrice: 400,
    category: 'groceries',
  },
  {
    id: 'gym',
    name: 'מנוי חדר כושר',
    emoji: '💪',
    basePrice: 250,
    category: 'fitness',
  },
];

// ── Config Export ───────────────────────────────────────────────────────

export const inflationRaceConfig: InflationRaceConfig = {
  initialMoney: INITIAL_MONEY,
  inflationRate: INFLATION_RATE,
  investmentReturn: INVESTMENT_RETURN,
  minYears: 1,
  maxYears: 20,
  products,
};
