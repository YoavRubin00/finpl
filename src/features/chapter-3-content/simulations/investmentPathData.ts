/** Path event data and configuration for the "Investment Obstacle Course" simulation (Module 3-17) */

import type { PathEvent, InvestmentPathConfig } from './investmentPathTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial deposit into kupat gemel (₪) */
const INITIAL_DEPOSIT = 10_000;

/** Monthly recurring deposit (₪) */
const MONTHLY_DEPOSIT = 500;

/** Annual return rate (7%) */
const ANNUAL_RETURN = 0.07;

/**
 * Tax rate on gains for a lump-sum (הונית) withdrawal from קופת גמל להשקעה.
 * Applies at ANY age — including after 60 if withdrawn as a lump sum. The 0%
 * tax break only kicks in for monthly-annuity withdrawals (קצבה) after age 60.
 * The simulation models 15 years of life, so all in-sim withdrawals are
 * lump-sum and pay this rate.
 */
const EARLY_WITHDRAWAL_TAX = 0.25;

// ── Path Events (8 events over 15 years) ──────────────────────────────

const events: PathEvent[] = [
  {
    id: 'event-1',
    year: 1,
    description: 'שנה ראשונה: הכסף שלכם גדל בהתמדה. התשואה יפה ואתם מרוצים.',
    emoji: '📈',
    type: 'growth',
    options: [
      {
        id: 'e1-continue',
        label: 'המשך להשקיע',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'מצוין! התחלה טובה. הכסף שלכם ממשיך לצמוח.',
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
        feedback: 'בחירה חכמה! ירידות הן חלק טבעי מהשוק. הכסף שלכם ימשיך לצמוח.',
      },
      {
        id: 'e2-withdraw',
        label: 'משוך הכל',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'מכרתם בהפסד! שילמתם 25% מס על הרווחים ויצאתם מהשוק.',
      },
    ],
  },
  {
    id: 'event-3',
    year: 4,
    description: 'חבר אומר: "תמשכו הכל ותשקיעו בקריפטו! עשיתי x10!" 🤑',
    emoji: ' מטבעות',
    type: 'temptation',
    options: [
      {
        id: 'e3-continue',
        label: 'לא תודה, ממשיך',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'קור רוח! קריפטו מסוכן. הקופה שלכם בטוחה וגדלה לאט אבל בטוח.',
      },
      {
        id: 'e3-withdraw',
        label: 'יאללה קריפטו!',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכתם הכל! שילמתם 25% מס על הרווחים. הקריפטו שלכם ירד 80% אחרי חודש... 😬',
      },
    ],
  },
  {
    id: 'event-4',
    year: 6,
    // NOTE: קופת גמל להשקעה היא נזילה מהיום הראשון — אין כלל "שש שנים".
    // כלל ה-6 שנים שייך לקרן השתלמות (מוצר שונה). כאן מציינים אבן דרך
    // התנהגותית: 6 שנות משמעת + ריבית דריבית שמתחילה להאיץ.
    description: 'אבן דרך: 6 שנים של משמעת! ריבית דריבית מתחילה להאיץ — הרווחים מרוויחים רווחים.',
    emoji: '🚀',
    type: 'milestone',
    options: [
      {
        id: 'e4-continue',
        label: 'ממשיך כמו שעון',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'חכמים! קופת גמל להשקעה נזילה תמיד, אבל הכוח האמיתי הוא הזמן. תנו לו לצמוח עד גיל 60 כדי לקבל קצבה פטורה ממס.',
      },
      {
        id: 'e4-withdraw',
        label: 'משוך לטיול שאני חולם עליו',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכתם! בקופת גמל להשקעה משיכה הונית חייבת תמיד ב-25% מס על הרווח הריאלי — בכל גיל. הפסדתם גם את הפטור על הקצבה בגיל 60.',
      },
    ],
  },
  {
    id: 'event-5',
    year: 8,
    description: 'מפולת בשוק! ירידה של 20%. התיק שלכם ירד משמעותית. 😨',
    emoji: '💥',
    type: 'dip',
    options: [
      {
        id: 'e5-continue',
        label: 'מחזיק חזק',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'גיבורים! המפולת הזו תיראה כמו גלישה קטנה בעוד כמה שנים.',
      },
      {
        id: 'e5-withdraw',
        label: 'מפסיק הפסדים!',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'מכרתם בשפל! שילמתם 25% מס על הרווחים ונעלתם הפסדים.',
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
        feedback: 'נכון! קחו הלוואה קטנה או תשתמשו בחסכונות אחרים. הקופה ממשיכה לצמוח.',
      },
      {
        id: 'e6-withdraw',
        label: 'משוך מהקופה',
        effect: 'withdraw',
        taxImplication: EARLY_WITHDRAWAL_TAX,
        feedback: 'משכתם! שילמתם 25% מס על הרווחים. הרכב תוקן, אבל החיסכון נפגע.',
      },
    ],
  },
  {
    id: 'event-7',
    year: 12,
    description: 'שוק שוורי! עלייה מטורפת של 25%. הקופה שלכם בשיא כל הזמנים! 🎉',
    emoji: '🚀',
    type: 'growth',
    options: [
      {
        id: 'e7-continue',
        label: 'ממשיך לרכב על הגל',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'מדהים! ריבית דריבית עושה את הקסם. עוד 3 שנים ואתם בפסגה.',
      },
      {
        id: 'e7-add',
        label: 'הגדל הפקדות',
        effect: 'add-more',
        taxImplication: 0,
        feedback: 'חכמים! מוסיפים עוד בזמן שהשוק עולה. הריבית דריבית תעבוד בשבילכם.',
      },
    ],
  },
  {
    id: 'event-8',
    year: 15,
    description: 'הגעתם ליעד! 15 שנה של חיסכון. הקופה שלכם גדלה באופן מדהים. 🏆',
    emoji: '🎯',
    type: 'milestone',
    options: [
      {
        id: 'e8-summary',
        label: 'ראה סיכום',
        effect: 'continue',
        taxImplication: 0,
        feedback: 'סבלנות משתלמת! הנה הסיכום המלא של המסע שלכם.',
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

/** Tax rate on real gains for any lump-sum (הונית) withdrawal — applies at every age. */
export const EARLY_TAX_RATE = EARLY_WITHDRAWAL_TAX;

/**
 * Tax rate when the saver elects to withdraw as a monthly annuity (קצבה
 * מוכרת) after age 60 AND meets the minimum-pension condition. 0% only in
 * this specific path; a post-60 lump-sum still pays EARLY_TAX_RATE.
 */
export const POST_60_ANNUITY_TAX_RATE = 0;
