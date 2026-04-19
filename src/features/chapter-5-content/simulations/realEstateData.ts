/**
 * SIM 26: משחקי הנדל"ן (Real Estate Game), Module 5-26
 * Mortgage options, life events, and configuration data.
 */

import type {
  MortgageOption,
  RealEstateEvent,
  RealEstateConfig,
} from './realEstateTypes';

// ── Property Defaults ────────────────────────────────────────────────
export const PROPERTY_PRICE = 1_500_000; // ₪1,500,000
export const DOWN_PAYMENT = 300_000; // ₪300,000
export const LOAN_AMOUNT = PROPERTY_PRICE - DOWN_PAYMENT; // ₪1,200,000

// ── Mortgage Options ─────────────────────────────────────────────────
// Monthly payment calculated via PMT formula:
// PMT = P × r(1+r)^n / ((1+r)^n - 1)

export const MORTGAGE_OPTIONS: MortgageOption[] = [
  {
    id: 'fixed-safe',
    label: '100% ריבית קבועה',
    description: 'בטוח ויציב, תשלום זהה כל חודש, בלי הפתעות. עולה יותר בסה"כ.',
    fixedPercent: 1.0,
    variablePercent: 0,
    years: 25,
    monthlyPayment: 6_665, // ₪1.2M at 4.5% fixed, 25yr
  },
  {
    id: 'balanced-mix',
    label: '50/50 מיקס',
    description: 'חצי קבועה 4%, חצי משתנה 3.5%. מאוזן, חוסך קצת אבל עם סיכון קטן.',
    fixedPercent: 0.5,
    variablePercent: 0.5,
    years: 25,
    monthlyPayment: 6_165, // ₪600K at 4% + ₪600K at 3.5%, 25yr
  },
  {
    id: 'variable-risky',
    label: '100% ריבית משתנה',
    description: 'הכי זול בהתחלה, אבל ריבית יכולה לזנק. הימור על העתיד.',
    fixedPercent: 0,
    variablePercent: 1.0,
    years: 30,
    monthlyPayment: 5_058, // ₪1.2M at 3% variable, 30yr
  },
];

// ── Fixed & Variable Rates ───────────────────────────────────────────
// Used by the hook to compute actual payments and apply rate events
export const FIXED_RATE = 0.045; // 4.5% for option 1
export const FIXED_RATE_MIX = 0.04; // 4% for the fixed portion of option 2
export const VARIABLE_RATE_INITIAL = 0.035; // 3.5% initial for option 2 variable portion
export const VARIABLE_RATE_FULL = 0.03; // 3% initial for option 3 (all variable)

// ── Life Events ──────────────────────────────────────────────────────
export const REAL_ESTATE_EVENTS: RealEstateEvent[] = [
  {
    id: 'rate-hike-y3',
    year: 3,
    description: 'בנק ישראל מעלה ריבית! הריבית המשתנה קופצת ב-1.5%',
    emoji: '📈',
    effect: 'rate-hike',
    impact: 0.015, // +1.5% to variable rate
  },
  {
    id: 'renovation-y5',
    year: 5,
    description: 'צריך שיפוץ דחוף, צנרת ישנה ורטיבות. עלות: ₪80,000',
    emoji: '🔧',
    effect: 'expense',
    impact: 80_000,
  },
  {
    id: 'value-up-y8',
    year: 8,
    description: 'שכונה התפתחה, רכבת קלה חדשה! ערך הנכס עלה 20%',
    emoji: '🏗️',
    effect: 'property-value',
    impact: 0.20, // +20%
  },
  {
    id: 'rate-drop-y12',
    year: 12,
    description: 'הריבית יורדת! בנק ישראל מוריד 1%, ההחזר החודשי קטן',
    emoji: '📉',
    effect: 'rate-hike', // reuse rate-hike effect type; negative impact = drop
    impact: -0.01, // -1% to variable rate
  },
  {
    id: 'tax-y15',
    year: 15,
    description: 'היטל השבחה מיוחד מהעירייה, ₪30,000 תשלום חד-פעמי',
    emoji: '🏛️',
    effect: 'expense',
    impact: 30_000,
  },
  {
    id: 'summary-y20',
    year: 20,
    description: 'עשרים שנה עברו! הגיע הזמן לסכם את המסע הפיננסי שלך',
    emoji: '🏠',
    effect: 'property-value',
    impact: 0, // summary event, no additional impact
  },
];

// ── Config ────────────────────────────────────────────────────────────
export const realEstateConfig: RealEstateConfig = {
  propertyPrice: PROPERTY_PRICE,
  downPayment: DOWN_PAYMENT,
  mortgageOptions: MORTGAGE_OPTIONS,
  events: REAL_ESTATE_EVENTS,
};
