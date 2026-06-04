/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Lifestyle presets and configuration data for the FIRE calculator.
 */

import type { LifestyleBand, SavingsRateOption, FIREConfig } from './fireCalcTypes';

// ── Default Parameters ────────────────────────────────────────────────
export const DEFAULT_MONTHLY_INCOME = 15_000; // ₪15,000
export const DEFAULT_CURRENT_AGE = 25;

// ── Lifestyle Bands ───────────────────────────────────────────────────
// Selected by ACTUAL monthly disposable spend = income × (1 - savingsRate),
// NOT by savings rate. Bands are ordered ascending by minMonthly; the chosen
// band is the highest whose minMonthly ≤ spend. Reachable spend in the
// calculator: ₪1,500 (5k×0.30) … ₪90,000 (100k×0.90).
// Cost-of-living anchors (Israel 2025–2026 estimates, designed with וארן):
// avg net salary ≈ ₪11k → band 4; net minimum ≈ ₪5.5k → bottom of band 3.

export const LIFESTYLE_BANDS: LifestyleBand[] = [
  {
    minMonthly: 0,
    maxMonthly: 2_999,
    label: 'על הקצה',
    emoji: '😣',
    description: 'חדר בשותפות בפריפריה, מבשלים הכל בבית, אוטובוסים בלבד, אפס טיולים.',
    luxuryLevel: 1,
  },
  {
    minMonthly: 3_000,
    maxMonthly: 4_999,
    label: 'מינימליסט',
    emoji: '🎒',
    description: 'דירת שותפים, אוכל ביתי עם טייקאאוט מדי פעם, תחב"צ, טיול אחד בארץ בשנה.',
    luxuryLevel: 2,
  },
  {
    minMonthly: 5_000,
    maxMonthly: 7_999,
    label: 'מאוזן צעיר',
    emoji: '⚖️',
    description: 'דירה קטנה או שותפים במרכז, מסעדה פעם בשבוע, טיול תקציבי אחד לחו"ל.',
    luxuryLevel: 3,
  },
  {
    minMonthly: 8_000,
    maxMonthly: 12_999,
    label: 'חיים נוחים',
    emoji: '🛋️',
    description: 'דירת 1–2 חדרים באזור טוב, יוצאים לאכול בקביעות, אוטו יד שנייה, חופשה טובה בחו"ל.',
    luxuryLevel: 4,
  },
  {
    minMonthly: 13_000,
    maxMonthly: 19_999,
    label: 'חיים טובים',
    emoji: '😎',
    description: 'דירה יפה במרכז, מסעדות מתי שבא, רכב חדש בליסינג, שתי חופשות בחו"ל בשנה.',
    luxuryLevel: 5,
  },
  {
    minMonthly: 20_000,
    maxMonthly: 34_999,
    label: 'שפע',
    emoji: '💎',
    description: 'בית מרווח באזור חזק, שף מתי שמתחשק, רכב פרימיום, כמה טיסות בשנה בלי להסתכל במחיר.',
    luxuryLevel: 6,
  },
  {
    minMonthly: 35_000,
    maxMonthly: null,
    label: 'חופש מלא',
    emoji: '🛥️',
    description: 'בית יוקרה, ביזנס בכל טיסה, כל מה שבא לך — הכסף כבר לא השיקול.',
    luxuryLevel: 7,
  },
];

// ── Savings-rate options ──────────────────────────────────────────────
// Drives the score-screen "השוואת שיעורי חיסכון" table only (years-to-FIRE
// per rate). Kept separate from LIFESTYLE_BANDS so the lifestyle preview and
// the rate comparison stay independent concerns.
export const SAVINGS_RATE_OPTIONS: SavingsRateOption[] = [
  { savingsRate: 0.10, emoji: '🎉' },
  { savingsRate: 0.20, emoji: '⚖️' },
  { savingsRate: 0.30, emoji: '🧠' },
  { savingsRate: 0.50, emoji: '🔥' },
  { savingsRate: 0.70, emoji: '🏔️' },
];

// ── Config ────────────────────────────────────────────────────────────
export const fireCalcConfig: FIREConfig = {
  monthlyIncome: DEFAULT_MONTHLY_INCOME,
  annualReturn: 0.07,
  withdrawalRate: 0.04, // the 4% rule
};
