/** Path event data and configuration for the "Investment Obstacle Course" simulation (Module 3-17) */

import type { PathEvent, InvestmentPathConfig } from './investmentPathTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial deposit into kupat gemel (₪) */
const INITIAL_DEPOSIT = 10_000;

/** Monthly recurring deposit (₪) */
const MONTHLY_DEPOSIT = 500;

/** Annual return rate (7%) */
const ANNUAL_RETURN = 0.07;

/** Tax rate on gains for early withdrawal (before age 60) */
const EARLY_WITHDRAWAL_TAX = 0.25;

// ── Path Events (8 events over 15 years) ──────────────────────────────

const events: PathEvent[] = [
  {
    id: 'event-1',
    year: 1,
    description: 'שנה ראשונה: הכסף שלך גדל בהתמדה. התשואה יפה ואתה מרוצה.',
    emoji: '📈',
    type: 'growth',
    options: [
      {
        id: 'e1-continue',
        label: 'המשך להשקיע',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'מצוין! התחלה טובה. הכסף שלך ממשיך לצמוח.',
      },
      {
        id: 'e1-add',
        label: 'הגדל הפקדה חודשית',
        effect: 'add-more',
        taxImplication: 0,
        feedback: 'יופי! הפקדה גדולה יותר = צמיחה מהירה יותר.',
      },
    ],
  },
  {
    id: 'event-2',
    year: 3,
    description: 'השוק ירד 15%. הכותרות מפחידות: "משבר בדרך!" חברים מספרים שמכרו הכל.',
    emoji: '📉',
    type: 'dip',
    options: [
      {
        id: 'e2-continue',
        label: 'סבלנות, ממשיך',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'בחירה חכמה! ירידות הן חלק טבעי מהשוק. הכסף שלך ימשיך לצמוח.',
      },
      {
        id: 'e2-withdraw',
        label: 'משוך הכל',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'מכרת בהפסד! שילמת 25% מס על הרווחים ויצאת מהשוק.',
      },
    ],
  },
  {
    id: 'event-3',
    year: 4,
    description: 'חבר אומר: "תמשוך הכל ותשקיע בקריפטו! עשיתי x10!" 🤑',
    emoji: ' מטבעות',
    type: 'temptation',
    options: [
      {
        id: 'e3-continue',
        label: 'לא תודה, ממשיך',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'קור רוח! קריפטו מסוכן. הקופה שלך בטוחה וגדלה לאט אבל בטוח.',
      },
      {
        id: 'e3-withdraw',
        label: 'יאללה קריפטו!',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכת הכל! שילמת 25% מס על הרווחים. הקריפטו שלך ירד 80% אחרי חודש... 😬',
      },
    ],
  },
  {
    id: 'event-4',
    year: 6,
    description: 'הקופה הפכה לנזילה! עכשיו אפשר למשוך בלי קנס. הכסף שלך גדל יפה.',
    emoji: '🔓',
    type: 'milestone',
    options: [
      {
        id: 'e4-continue',
        label: 'מעולה, ממשיך',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'חכם! רק כי הכסף נזיל, לא חייבים למשוך אותו. תן לו לצמוח.',
      },
      {
        id: 'e4-withdraw',
        label: 'סוף סוף! משוך הכל',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכת! שילמת 25% מס על הרווחים. הכסף היה יכול לצמוח עוד הרבה...',
      },
    ],
  },
  {
    id: 'event-5',
    year: 8,
    description: 'מפולת בשוק! ירידה של 20%. התיק שלך ירד משמעותית. 😨',
    emoji: '💥',
    type: 'dip',
    options: [
      {
        id: 'e5-continue',
        label: 'מחזיק חזק',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'גיבור! המפולת הזו תיראה כמו גלישה קטנה בעוד כמה שנים.',
      },
      {
        id: 'e5-withdraw',
        label: 'מפסיק הפסדים!',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'מכרת בשפל! שילמת 25% מס על הרווחים ונעלת הפסדים.',
      },
    ],
  },
  {
    id: 'event-6',
    year: 10,
    description: 'הרכב התקלקל! צריך ₪15,000 דחוף. הפיתוי למשוך מהקופה עצום.',
    emoji: '🚗',
    type: 'temptation',
    options: [
      {
        id: 'e6-continue',
        label: 'אמצא פתרון אחר',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'נכון! קח הלוואה קטנה או תשתמש בחסכונות אחרים. הקופה ממשיכה לצמוח.',
      },
      {
        id: 'e6-withdraw',
        label: 'משוך מהקופה',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכת! שילמת 25% מס על הרווחים. הרכב תוקן, אבל החיסכון נפגע.',
      },
    ],
  },
  {
    id: 'event-7',
    year: 12,
    description: 'שוק שוורי! עלייה מטורפת של 25%. הקופה שלך בשיא כל הזמנים! 🎉',
    emoji: '🚀',
    type: 'growth',
    options: [
      {
        id: 'e7-continue',
        label: 'ממשיך לרכב על הגל',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'מדהים! ריבית דריבית עושה את הקסם. עוד 3 שנים ואתה בפסגה.',
      },
      {
        id: 'e7-add',
        label: 'הגדל הפקדות',
        effect: 'add-more',
        taxImplication: 0,
        feedback: 'חכם! מוסיף עוד בזמן שהשוק עולה. הריבית דריבית תעבוד בשבילך.',
      },
    ],
  },
  {
    id: 'event-8',
    year: 15,
    description: 'הגעת ליעד! 15 שנה של חיסכון. הקופה שלך גדלה באופן מדהים. 🏆',
    emoji: '🎯',
    type: 'milestone',
    options: [
      {
        id: 'e8-summary',
        label: 'ראה סיכום',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'סבלנות משתלמת! הנה הסיכום המלא של המסע שלך.',
      },
    ],
  },
];

// ── Config Export ───────────────────────────────────────────────────────

export const investmentPathConfig: InvestmentPathConfig = {
  initialDeposit: INITIAL_DEPOSIT,
  monthlyDeposit: MONTHLY_DEPOSIT,
  annualReturn: ANNUAL_RETURN,
  events,
};

/** Tax rate on gains for early withdrawal (before age 60) */
export const EARLY_TAX_RATE = EARLY_WITHDRAWAL_TAX;

/** Tax rate on gains for post-60 withdrawal */
export const POST_60_TAX_RATE = 0;
