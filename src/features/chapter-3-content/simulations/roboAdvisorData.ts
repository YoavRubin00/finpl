/** Risk quiz, market data, and configuration for the "Robo-Advisor" simulation (Module 3-18) */

import type {
  RiskQuestion,
  MarketYear,
  PortfolioAllocation,
  RoboAdvisorConfig,
} from './roboAdvisorTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial investment amount (₪) */
const INITIAL_INVESTMENT = 100_000;

/** Allocation drift threshold triggering a rebalance (5%) */
const REBALANCE_THRESHOLD = 0.05;

// ── Risk Questions ─────────────────────────────────────────────────────

const riskQuestions: RiskQuestion[] = [
  {
    id: 'q-1',
    question: 'השוק ירד 30%. מה אתה עושה?',
    emoji: '📉',
    options: [
      { id: 'q1-a', label: 'מוכר הכל מיד — לא מוכן להפסיד', riskScore: 1 },
      { id: 'q1-b', label: 'מוכר חצי, שומר חצי', riskScore: 2 },
      { id: 'q1-c', label: 'לא עושה כלום — ממתין', riskScore: 3 },
      { id: 'q1-d', label: 'קונה עוד! הנחה של 30%!', riskScore: 5 },
    ],
  },
  {
    id: 'q-2',
    question: 'מתי תצטרך את הכסף?',
    emoji: '⏰',
    options: [
      { id: 'q2-a', label: 'בשנה-שנתיים הקרובות', riskScore: 1 },
      { id: 'q2-b', label: 'בעוד 3-5 שנים', riskScore: 2 },
      { id: 'q2-c', label: 'בעוד 5-10 שנים', riskScore: 4 },
      { id: 'q2-d', label: 'לא צריך אותו בעשור הקרוב', riskScore: 5 },
    ],
  },
  {
    id: 'q-3',
    question: 'מה יותר כואב — להפסיד ₪1,000 או לפספס רווח של ₪1,000?',
    emoji: '💔',
    options: [
      { id: 'q3-a', label: 'להפסיד כואב הרבה יותר', riskScore: 1 },
      { id: 'q3-b', label: 'להפסיד כואב קצת יותר', riskScore: 2 },
      { id: 'q3-c', label: 'שניהם כואבים אותו דבר', riskScore: 3 },
      { id: 'q3-d', label: 'לפספס רווח כואב יותר!', riskScore: 5 },
    ],
  },
];

// ── Risk Profile → Allocation Mapping ──────────────────────────────────

/** Maps risk profile score (1-5) to portfolio allocation */
export const RISK_ALLOCATION_MAP: Record<number, PortfolioAllocation> = {
  1: { stocks: 30, bonds: 50, cash: 20 },  // Conservative
  2: { stocks: 45, bonds: 40, cash: 15 },  // Moderate-Conservative
  3: { stocks: 60, bonds: 30, cash: 10 },  // Balanced
  4: { stocks: 75, bonds: 20, cash: 5 },   // Growth
  5: { stocks: 85, bonds: 10, cash: 5 },   // Aggressive
};

/** Hebrew labels for risk profiles */
export const RISK_PROFILE_LABELS: Record<number, string> = {
  1: 'שמרן',
  2: 'שמרן-מתון',
  3: 'מאוזן',
  4: 'צמיחה',
  5: 'אגרסיבי',
};

// ── 10-Year Market History (inspired by 2014-2024) ─────────────────────
// Mix of good years, crashes, and recoveries

const marketHistory: MarketYear[] = [
  {
    year: 1,
    stockReturn: 0.12,
    bondReturn: 0.04,
    headline: '📈 שנה טובה — מניות עולות 12%',
  },
  {
    year: 2,
    stockReturn: 0.08,
    bondReturn: 0.03,
    headline: '📊 שנה יציבה — צמיחה מתונה',
  },
  {
    year: 3,
    stockReturn: -0.15,
    bondReturn: 0.05,
    headline: '⚠️ תיקון בשוק — מניות יורדות 15%',
  },
  {
    year: 4,
    stockReturn: 0.20,
    bondReturn: 0.02,
    headline: '🚀 התאוששות חזקה — מניות קופצות 20%',
  },
  {
    year: 5,
    stockReturn: 0.15,
    bondReturn: 0.04,
    headline: '📈 שוק שוורי — עוד שנת שיא',
  },
  {
    year: 6,
    stockReturn: -0.30,
    bondReturn: 0.06,
    headline: '💥 קריסה! מניות צונחות 30%',
  },
  {
    year: 7,
    stockReturn: 0.25,
    bondReturn: 0.03,
    headline: '🌱 התאוששות — השוק חוזר עם 25%',
  },
  {
    year: 8,
    stockReturn: 0.18,
    bondReturn: 0.04,
    headline: '📊 צמיחה בריאה — +18% למניות',
  },
  {
    year: 9,
    stockReturn: -0.10,
    bondReturn: 0.05,
    headline: '😰 ירידה קלה — תיקון של 10%',
  },
  {
    year: 10,
    stockReturn: 0.22,
    bondReturn: 0.03,
    headline: '🏆 סיום חזק! מניות עולות 22%',
  },
];

// ── Manual Investor Behavior ───────────────────────────────────────────

/**
 * Manual investor panic-sells 50% of stocks when stock return drops below this threshold.
 * Buys back the next year (always at a higher price after recovery).
 */
export const MANUAL_PANIC_SELL_THRESHOLD = -0.15;

/** Fraction of stocks the manual investor sells during a crash */
export const MANUAL_SELL_FRACTION = 0.5;

/**
 * Cash return used for the manual investor's "parked" cash after panic-selling.
 * Represents money sitting in savings account during recovery.
 */
export const MANUAL_CASH_RETURN = 0.01;

// ── Config Export ───────────────────────────────────────────────────────

export const roboAdvisorConfig: RoboAdvisorConfig = {
  questions: riskQuestions,
  marketHistory,
  rebalanceThreshold: REBALANCE_THRESHOLD,
  initialInvestment: INITIAL_INVESTMENT,
};
