/**
 * SIM 4-29: מיון המניות (Stock Sorter) — Module 4-29
 * 8 real stocks with classification questions (growth/value, cyclical/defensive, cap size).
 */

import type { StockCard, SortQuestion, StockSorterConfig } from './stockSorterTypes';

// ── Stock Cards (real data, approximate 2025-2026) ──────────────────────────

const STOCKS: StockCard[] = [
  {
    id: 'apple',
    name: 'Apple',
    emoji: '🍎',
    ticker: 'AAPL',
    marketCapB: 3500,
    peRatio: 33,
    dividendYield: 0.5,
    sector: 'טכנולוגיה',
    isGrowth: true,
    isCyclical: false,
    capSize: 'large',
    explanationHe: 'אפל נסחרת במכפיל גבוה (33) כי השוק מתמחר צמיחה מתמשכת בשירותים וב-AI. למרות דיבידנד קטן, עיקר התשואה מעליית המניה.',
  },
  {
    id: 'hapoalim',
    name: 'בנק הפועלים',
    emoji: '🏦',
    ticker: 'POLI',
    marketCapB: 14,
    peRatio: 7,
    dividendYield: 5.0,
    sector: 'בנקאות',
    isGrowth: false,
    isCyclical: true,
    capSize: 'large',
    explanationHe: 'מניית ערך קלאסית — מכפיל 7 ודיבידנד 5%. כבנק, הרווחיות תלויה בריבית ובמצב הכלכלה, ולכן הוא מחזורי.',
  },
  {
    id: 'tesla',
    name: 'Tesla',
    emoji: '⚡',
    ticker: 'TSLA',
    marketCapB: 1300,
    peRatio: 180,
    dividendYield: 0,
    sector: 'רכב וטכנולוגיה',
    isGrowth: true,
    isCyclical: true,
    capSize: 'large',
    explanationHe: 'מכפיל 180 — המשקיעים מהמרים על נהיגה אוטונומית ורובוטיקה. אין דיבידנד, הכל מושקע בצמיחה. מחזורית כי מכירות רכב תלויות בכלכלה.',
  },
  {
    id: 'cocacola',
    name: 'Coca-Cola',
    emoji: '🥤',
    ticker: 'KO',
    marketCapB: 270,
    peRatio: 24,
    dividendYield: 3.0,
    sector: 'צריכה בסיסית',
    isGrowth: false,
    isCyclical: false,
    capSize: 'large',
    explanationHe: 'אנשים קונים משקאות בכל מצב כלכלי — לכן דפנסיבית. דיבידנד שעולה כבר 60+ שנה ברציפות. מניית ערך קלאסית.',
  },
  {
    id: 'teva',
    name: 'Teva',
    emoji: '💊',
    ticker: 'TEVA',
    marketCapB: 25,
    peRatio: 14,
    dividendYield: 0,
    sector: 'תרופות',
    isGrowth: false,
    isCyclical: false,
    capSize: 'large',
    explanationHe: 'חברת גנריקה דפנסיבית — ביקוש לתרופות קיים בכל מצב כלכלי. מכפיל נמוך (14) משקף שנים של חוב כבד, אבל החברה בהתאוששות.',
  },
  {
    id: 'nvidia',
    name: 'Nvidia',
    emoji: '🟢',
    ticker: 'NVDA',
    marketCapB: 3200,
    peRatio: 55,
    dividendYield: 0.03,
    sector: 'שבבים',
    isGrowth: true,
    isCyclical: true,
    capSize: 'large',
    explanationHe: 'מנועת ה-AI — שולטת בשוק שבבי GPU. מכפיל 55 כי ההכנסות צומחות במאות אחוזים. ביקוש לשבבים מחזורי ותלוי בהשקעות הון.',
  },
  {
    id: 'pg',
    name: 'P&G',
    emoji: '🧴',
    ticker: 'PG',
    marketCapB: 390,
    peRatio: 26,
    dividendYield: 2.4,
    sector: 'צריכה בסיסית',
    isGrowth: false,
    isCyclical: false,
    capSize: 'large',
    explanationHe: 'מוכרת סבון, חיתולים ומשחת שיניים — דברים שקונים גם במיתון. דיבידנד יציב 67 שנה ברציפות. דפנסיבית קלאסית.',
  },
  {
    id: 'elbit',
    name: 'אלביט מערכות',
    emoji: '🛡️',
    ticker: 'ESLT',
    marketCapB: 13,
    peRatio: 35,
    dividendYield: 0.8,
    sector: 'ביטחון',
    isGrowth: true,
    isCyclical: false,
    capSize: 'mid',
    explanationHe: 'חברת ביטחון ישראלית שצומחת בזכות עלייה בתקציבי ביטחון עולמיים. דפנסיבית — ביקוש לציוד צבאי לא תלוי בכלכלה.',
  },
];

// ── Questions (alternating: growth_value, cyclical_defensive, cap_size) ─────

const QUESTIONS: SortQuestion[] = [
  {
    card: STOCKS[0], // Apple
    questionType: 'growth_value',
    correctAnswer: 'צמיחה',
  },
  {
    card: STOCKS[1], // Bank Hapoalim
    questionType: 'cyclical_defensive',
    correctAnswer: 'מחזורית',
  },
  {
    card: STOCKS[2], // Tesla
    questionType: 'cap_size',
    correctAnswer: 'גדולה',
  },
  {
    card: STOCKS[3], // Coca-Cola
    questionType: 'growth_value',
    correctAnswer: 'ערך',
  },
  {
    card: STOCKS[4], // Teva
    questionType: 'cyclical_defensive',
    correctAnswer: 'דפנסיבית',
  },
  {
    card: STOCKS[5], // Nvidia
    questionType: 'growth_value',
    correctAnswer: 'צמיחה',
  },
  {
    card: STOCKS[6], // P&G
    questionType: 'cyclical_defensive',
    correctAnswer: 'דפנסיבית',
  },
  {
    card: STOCKS[7], // Elbit
    questionType: 'cap_size',
    correctAnswer: 'בינונית',
  },
];

// ── Config Export ────────────────────────────────────────────────────────────

export const stockSorterConfig: StockSorterConfig = {
  questions: QUESTIONS,
};

/** Total number of sort questions */
export const TOTAL_QUESTIONS = QUESTIONS.length;

/** Hebrew labels for question types */
export const QUESTION_LABELS: Record<string, string> = {
  growth_value: 'האם זו מניית צמיחה או ערך?',
  cyclical_defensive: 'האם זו מנייה מחזורית או דפנסיבית?',
  cap_size: 'מה גודל החברה?',
};

/** Hebrew answer options per question type */
export const ANSWER_OPTIONS: Record<string, string[]> = {
  growth_value: ['צמיחה', 'ערך'],
  cyclical_defensive: ['מחזורית', 'דפנסיבית'],
  cap_size: ['גדולה', 'בינונית', 'קטנה'],
};
