/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Lifestyle presets and configuration data for the FIRE calculator.
 */

import type { LifestylePreset, FIREConfig } from './fireCalcTypes';

// ── Default Parameters ────────────────────────────────────────────────
export const DEFAULT_MONTHLY_INCOME = 15_000; // ₪15,000
export const DEFAULT_CURRENT_AGE = 25;

// ── Lifestyle Presets ─────────────────────────────────────────────────
// yearlyExpenses = monthlyIncome × (1 - savingsRate) × 12
// Based on DEFAULT_MONTHLY_INCOME of ₪15,000

export const LIFESTYLE_PRESETS: LifestylePreset[] = [
  {
    savingsRate: 0.10,
    label: 'חיים להיום',
    emoji: '🎉',
    description: 'דירה שכורה במרכז, מסעדות כל שבוע, חופשה בחו"ל פעמיים בשנה, רכב חדש בליסינג',
    yearlyExpenses: 162_000, // 15000 × 0.90 × 12
    luxuryLevel: 5,
  },
  {
    savingsRate: 0.20,
    label: 'מאוזן',
    emoji: '⚖️',
    description: 'דירה שכורה נוחה, מסעדה פעם בשבועיים, חופשה שנתית אחת, תחבורה ציבורית + אוטו משותף',
    yearlyExpenses: 144_000, // 15000 × 0.80 × 12
    luxuryLevel: 4,
  },
  {
    savingsRate: 0.30,
    label: 'חסכן חכם',
    emoji: '🧠',
    description: 'דירה קטנה יותר, בישול בבית רוב הזמן, חופשה מקומית, תחבורה ציבורית',
    yearlyExpenses: 126_000, // 15000 × 0.70 × 12
    luxuryLevel: 3,
  },
  {
    savingsRate: 0.50,
    label: 'FIRE Warrior',
    emoji: '🔥',
    description: 'שותפים לדירה, ארוחות ביתיות בלבד, טיולים עם אוהל, אופניים ותחב"צ',
    yearlyExpenses: 90_000, // 15000 × 0.50 × 12
    luxuryLevel: 2,
  },
  {
    savingsRate: 0.70,
    label: 'מינימליסט קיצוני',
    emoji: '🏔️',
    description: 'גר עם ההורים או וואן, אוכל פשוט, אפס מותרות, כל שקל לחיסכון',
    yearlyExpenses: 54_000, // 15000 × 0.30 × 12
    luxuryLevel: 1,
  },
];

// ── Config ────────────────────────────────────────────────────────────
export const fireCalcConfig: FIREConfig = {
  monthlyIncome: DEFAULT_MONTHLY_INCOME,
  annualReturn: 0.07,
  withdrawalRate: 0.04, // the 4% rule
  lifestylePresets: LIFESTYLE_PRESETS,
};
