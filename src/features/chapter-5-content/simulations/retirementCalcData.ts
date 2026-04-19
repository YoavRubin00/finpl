/**
 * SIM 28: מחשבון הפרישה (Retirement Calculator), Module 5-28
 * Withdrawal strategies, tax rules, and configuration data.
 */

import type {
  WithdrawalStrategy,
  RetirementCalcConfig,
} from './retirementCalcTypes';

// ── Pension Defaults ─────────────────────────────────────────────────
export const PENSION_BALANCE = 2_000_000; // ₪2,000,000
export const RETIREMENT_AGE = 67;
export const SIMULATION_YEARS = 25; // 67 → 92
export const MONTHLY_EXPENSES = 12_000; // ₪12,000/month baseline

// ── Investment & Economic Rates ──────────────────────────────────────
export const LUMP_SUM_RETURN = 0.05; // 5% annual return on invested lump sum
export const INFLATION_RATE = 0.03; // 3% yearly inflation
export const ANNUITY_TAX_RATE = 0.10; // 10% tax on annuity income (lower bracket)
export const LUMP_SUM_TAX_RATE = 0.25; // 25% tax on investment gains

// ── Withdrawal Strategies ────────────────────────────────────────────

export const WITHDRAWAL_STRATEGIES: WithdrawalStrategy[] = [
  {
    id: 'lump-sum',
    type: 'lump-sum',
    label: 'קצבה הונית, הכל מראש',
    description:
      'מקבלים את כל ה-₪2,000,000 ומשקיעים ב-5%. מושכים לפי צורך. גמישות מלאה, אבל הכסף יכול להיגמר.',
    lumpSum: PENSION_BALANCE,
    riskLevel: 'high',
    hasInheritance: true,
  },
  {
    id: 'monthly-annuity',
    type: 'monthly-annuity',
    label: 'קצבה חודשית, מובטח לכל החיים',
    description:
      '₪8,500 בחודש מובטח עד 120. בלי דאגות, בלי סיכון, אבל אין מה להוריש.',
    monthlyAmount: 8_500,
    riskLevel: 'low',
    hasInheritance: false,
  },
  {
    id: 'hybrid',
    type: 'hybrid',
    label: 'משולב, הטוב משני העולמות',
    description:
      '30% הון (₪600,000 להשקעה) + קצבה מופחתת ₪6,000/חודש. גמישות + ביטחון.',
    lumpSum: 600_000,
    monthlyAmount: 6_000,
    riskLevel: 'medium',
    hasInheritance: true,
  },
];

// ── Config ───────────────────────────────────────────────────────────
export const retirementCalcConfig: RetirementCalcConfig = {
  pensionBalance: PENSION_BALANCE,
  monthlyExpenses: MONTHLY_EXPENSES,
  annuityRate: 8_500 / PENSION_BALANCE, // derives from annuity monthly amount
  lumpSumReturn: LUMP_SUM_RETURN,
  inflationRate: INFLATION_RATE,
  strategies: WITHDRAWAL_STRATEGIES,
};
