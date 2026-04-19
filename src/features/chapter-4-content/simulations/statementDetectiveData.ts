/**
 * SIM 4-25: בלש הדוחות (Statement Detective), Module 4-25
 * 5 company cases with realistic financial data for statement analysis.
 */

import type {
  FinancialSnippet,
  DetectiveRound,
  DetectiveConfig,
} from './statementDetectiveTypes';

// ── Company Snippets ────────────────────────────────────────────────────

const techGrow: FinancialSnippet = {
  id: 'tech-grow',
  companyName: 'טק-גרואו בע"מ',
  emoji: '💻',
  revenue: 850_000_000,
  netIncome: 45_000_000,
  cashFlow: -120_000_000,
  totalAssets: 1_200_000_000,
  totalLiabilities: 780_000_000,
  equity: 420_000_000,
  peRatio: 42,
  debtEquityRatio: 1.86,
  redFlags: [
    'תזרים מזומנים שלילי למרות רווח חשבונאי',
    'פער גדול בין רווח נקי לתזרים, רווח "נייר" בלבד',
    'יחס חוב-הון מעל 1.8',
  ],
};

const bankYatziv: FinancialSnippet = {
  id: 'bank-yatziv',
  companyName: 'בנק יציב',
  emoji: '🏦',
  revenue: 4_200_000_000,
  netIncome: 620_000_000,
  cashFlow: 580_000_000,
  totalAssets: 95_000_000_000,
  totalLiabilities: 86_000_000_000,
  equity: 9_000_000_000,
  peRatio: 8.5,
  debtEquityRatio: 0.65,
  redFlags: [],
};

const fashionPlus: FinancialSnippet = {
  id: 'fashion-plus',
  companyName: 'פאשן פלוס',
  emoji: '👗',
  revenue: 320_000_000,
  netIncome: -55_000_000,
  cashFlow: -80_000_000,
  totalAssets: 450_000_000,
  totalLiabilities: 390_000_000,
  equity: 60_000_000,
  peRatio: -5.8,
  debtEquityRatio: 6.5,
  redFlags: [
    'ירידה בהכנסות 3 שנים ברציפות',
    'הפסד נקי, החברה מפסידה כסף',
    'יחס חוב-הון 6.5, מינוף קיצוני',
    'תזרים מזומנים שלילי',
  ],
};

const mazonIsraeli: FinancialSnippet = {
  id: 'mazon-israeli',
  companyName: 'מזון ישראלי',
  emoji: '🥛',
  revenue: 2_100_000_000,
  netIncome: 180_000_000,
  cashFlow: 210_000_000,
  totalAssets: 3_500_000_000,
  totalLiabilities: 1_400_000_000,
  equity: 2_100_000_000,
  peRatio: 14,
  debtEquityRatio: 0.67,
  redFlags: [],
};

const cryptoTek: FinancialSnippet = {
  id: 'crypto-tek',
  companyName: 'קריפטו-טק',
  emoji: ' מטבעות',
  revenue: 1_800_000_000,
  netIncome: 30_000_000,
  cashFlow: -250_000_000,
  totalAssets: 2_000_000_000,
  totalLiabilities: 2_700_000_000,
  equity: -700_000_000,
  peRatio: 95,
  debtEquityRatio: 4.5,
  redFlags: [
    'הון עצמי שלילי, החובות עולים על הנכסים',
    'יחס חוב-הון 4.5, סיכון חדלות פירעון',
    'תזרים מזומנים שלילי חמור',
    'P/E של 95, תמחור מנותק מהמציאות',
  ],
};

// ── Rounds ───────────────────────────────────────────────────────────────

const ROUNDS: DetectiveRound[] = [
  {
    snippet: techGrow,
    correctVerdict: 'avoid',
    explanation:
      'למרות שהחברה מראה רווח נקי חיובי, תזרים המזומנים שלילי (-120 מיליון). ' +
      'זה אומר שהרווח הוא "נייר" בלבד, אין כסף אמיתי שנכנס לקופה. ' +
      'גם יחס חוב-הון של 1.86 מעיד על מינוף מסוכן.',
  },
  {
    snippet: bankYatziv,
    correctVerdict: 'invest',
    explanation:
      'בנק יציב מציג מאזן חזק: P/E נמוך (8.5), תזרים מזומנים חיובי קרוב לרווח הנקי, ' +
      'ויחס חוב-הון של 0.65 בלבד. זוהי חברה רווחית ויציבה עם מחיר הוגן.',
  },
  {
    snippet: fashionPlus,
    correctVerdict: 'avoid',
    explanation:
      'פאשן פלוס בצרות עמוקות: הכנסות יורדות, הפסד נקי, תזרים שלילי, ' +
      'ויחס חוב-הון קיצוני של 6.5. החברה עלולה להגיע לחדלות פירעון.',
  },
  {
    snippet: mazonIsraeli,
    correctVerdict: 'invest',
    explanation:
      'מזון ישראלי היא חברה יציבה קלאסית: הכנסות גבוהות ויציבות, רווח נקי חיובי, ' +
      'תזרים מזומנים חזק (גבוה מהרווח, סימן מצוין), P/E סביר של 14, ' +
      'ויחס חוב-הון בריא של 0.67.',
  },
  {
    snippet: cryptoTek,
    correctVerdict: 'avoid',
    explanation:
      'קריפטו-טק היא פצצה מתקתקת: הון עצמי שלילי (-700 מיליון) אומר שהחובות ' +
      'עולים על כל הנכסים. P/E של 95 מעיד על ציפיות מנופחות, ' +
      'ותזרים מזומנים שלילי חמור מאשר שהחברה שורפת מזומנים.',
  },
];

// ── Config Export ────────────────────────────────────────────────────────

/** Default time per round (seconds) */
const TIME_PER_ROUND = 30;

export const statementDetectiveConfig: DetectiveConfig = {
  rounds: ROUNDS,
  timePerRound: TIME_PER_ROUND,
};

/** Total number of rounds */
export const TOTAL_ROUNDS = ROUNDS.length;
