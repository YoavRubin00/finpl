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
      { id: 'q1-a', label: 'מוכר הכל מיד, לא מוכן להפסיד', riskScore: 1 },
      { id: 'q1-b', label: 'מוכר חצי, שומר חצי', riskScore: 2 },
      { id: 'q1-c', label: 'לא עושה כלום, ממתין', riskScore: 3 },
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
    question: 'מה יותר כואב, להפסיד ₪1,000 או לפספס רווח של ₪1,000?',
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

// ── 10-Year Market History, REAL DATA 2014-2023 ──────────────────────
// Stocks: S&P 500 Total Return (dividends reinvested)
// Bonds: Bloomberg US Aggregate Bond Index
export const DATA_START_YEAR = 2014;
export const DATA_END_YEAR = 2023;

const marketHistory: MarketYear[] = [
  {
    year: 2014,
    stockReturn: 0.137,
    bondReturn: 0.060,
    headline: '2014 · שנה סולידית, S&P 500 עולה 13.7%',
  },
  {
    year: 2015,
    stockReturn: 0.014,
    bondReturn: 0.005,
    headline: '2015 · שנה שטוחה, חששות מהעלאת ריבית הפד',
  },
  {
    year: 2016,
    stockReturn: 0.120,
    bondReturn: 0.026,
    headline: '2016 · ברקזיט ובחירות ארה"ב, השוק עולה 12%',
  },
  {
    year: 2017,
    stockReturn: 0.218,
    bondReturn: 0.035,
    headline: '2017 · שוק שורי שקט, +21.8% ללא ירידה משמעותית',
  },
  {
    year: 2018,
    stockReturn: -0.044,
    bondReturn: 0.001,
    headline: '2018 · מכירות ברבעון 4, S&P 500 יורד 4.4%',
  },
  {
    year: 2019,
    stockReturn: 0.315,
    bondReturn: 0.087,
    headline: '2019 · היפוך הפד, שנה פנטסטית, +31.5%',
  },
  {
    year: 2020,
    stockReturn: 0.184,
    bondReturn: 0.075,
    headline: '2020 · קריסת הקורונה + התאוששות, +18.4% בשנה',
  },
  {
    year: 2021,
    stockReturn: 0.287,
    bondReturn: -0.015,
    headline: '2021 · פתיחה מחודשת + תמריצים, +28.7%',
  },
  {
    year: 2022,
    stockReturn: -0.181,
    bondReturn: -0.130,
    headline: '2022 · אינפלציה + קריסת טק, -18.1% למניות, -13% לאג"ח',
  },
  {
    year: 2023,
    stockReturn: 0.263,
    bondReturn: 0.055,
    headline: '2023 · ראלי AI, התאוששות של +26.3%',
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
