/**
 * מילואים 2026 — the numbers behind MiluimCalculator.
 *
 * FACT-GATED (חוקרון 18.9.26): every figure below is verified in
 * docs/content/FACTS-2026-09-trends.md §1 against primary sources
 * (miluim.idf.il, btl.gov.il, כל-זכות, ספר החוקים 3461). Update BOTH when the
 * law changes. Sources inline.
 */

export type MiluimRole = 'combat' | 'combat_support' | 'rear';

export const MILUIM_ROLE_LABEL: Record<MiluimRole, string> = {
  combat: 'לוחם/ת',
  combat_support: 'תומך/ת לחימה',
  rear: 'עורפי',
};

/** Facts freshness stamp shown in the disclaimer. */
export const MILUIM_FACTS_ASOF = 'ספטמבר 2026';

/** Value of one tax-credit point, tax year 2026 (unchanged since 2024).
 *  // source: כל-זכות — נקודת זיכוי, updated 14.01.2026 — ₪242/חודש = ₪2,904/שנה */
export const CREDIT_POINT_VALUE_2026 = 2904;

/**
 * Reservist credit-point ladder — חוק לתיקון פקודת מס הכנסה (מס' 283), סעיף 39ב,
 * in force 1.1.2026–31.12.2027, for service in the PREVIOUS calendar year.
 * The law says "לוחם" (combat) only; eligibility of combat-support / rear
 * roles is NOT verified — we return 0 for them and say so in the UI.
 *   30–39 days → ½ · 40–49 → ¾ · 50–54 → 1 · +¼ per 5 further days · cap 4 (110+ days)
 *  // source: כל-זכות — נקודות זיכוי ממס הכנסה ללוחמי מילואים (07.01.2026); ספר החוקים 3461 (23.11.2025)
 */
export function creditPointsForDays(days: number, role: MiluimRole): number {
  if (role !== 'combat') return 0;
  if (days < 30) return 0;
  if (days < 40) return 0.5;
  if (days < 50) return 0.75;
  const extraSteps = Math.floor((days - 50) / 5);
  return Math.min(4, 1 + extraSteps * 0.25);
}

/**
 * "תגמול נוסף" (ביטוח לאומי, סעיף 19) — a tax-free lump sum by days served in
 * the calendar year, paid in May of the following year.
 *  // source: btl.gov.il — תגמול נוסף למשרתי מילואים 2026; מדיניות תגמולים 2026 (miluim.idf.il)
 */
const EXTRA_COMPENSATION_LADDER: ReadonlyArray<{ minDays: number; grant: number }> = [
  { minDays: 10, grant: 1_452 },
  { minDays: 15, grant: 2_904 },
  { minDays: 20, grant: 4_356 },
  { minDays: 37, grant: 5_808 },
];

export function grantForDays(days: number): number {
  let g = 0;
  for (const tier of EXTRA_COMPENSATION_LADDER) if (days >= tier.minDays) g = tier.grant;
  return g;
}

/** Daily compensation bounds, 1.1.2026 (ביטוח לאומי).
 *  // source: btl.gov.il — תגמולי מילואים 2026: מקסימום ₪1,730.33/יום, מינימום ₪328.76/יום */
export const DAILY_COMP_MIN_2026 = 328.76;
export const DAILY_COMP_MAX_2026 = 1730.33;

export interface MiluimResult {
  creditPoints: number;
  creditPointsValue: number;
  grant: number;
  totalValue: number;
  notes: string[];
}

export function computeMiluim(days: number, role: MiluimRole): MiluimResult {
  const creditPoints = creditPointsForDays(days, role);
  const creditPointsValue = Math.round(creditPoints * CREDIT_POINT_VALUE_2026);
  const grant = grantForDays(days);
  const notes: string[] = [];
  if (role !== 'combat' && days >= 30) {
    notes.push('החוק מעניק את נקודות הזיכוי המוגדלות למי ששירת "כלוחם". לתפקידים אחרים לא מצאנו זכאות מאושרת — כדאי לבדוק מול המעסיק או רואה החשבון.');
  }
  if (creditPoints > 0) {
    notes.push('נקודות הזיכוי מקטינות את המס — הן שוות כסף רק אם יש לכם מס לשלם באותה שנה.');
  }
  if (grant > 0) {
    notes.push('התגמול הנוסף משולם על ידי ביטוח לאומי במאי של השנה העוקבת, פטור ממס.');
  }
  return { creditPoints, creditPointsValue, grant, totalValue: creditPointsValue + grant, notes };
}

/** Benefits most reservists never claim. Copy = system voice (plural).
 *  // source: מדיניות תגמולים, מענקים והטבות למשרתי המילואים 2026 (miluim.idf.il); כל-זכות */
export const MILUIM_BENEFITS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'קדימות ב"דירה בהנחה"',
    body: 'חלק מהדירות בכל הגרלה שמור למשרתי מילואים. נרשמים באתר דירה בהנחה עם אישור צה"ל.',
  },
  {
    title: 'תגמול יומי מביטוח לאומי',
    body: `על כל יום שירות משלמים לפי השכר שלכם — לפחות ₪${DAILY_COMP_MIN_2026.toLocaleString('he-IL')} ליום גם למי שלא עבד. שכירים מקבלים דרך המעסיק.`,
  },
  {
    title: 'מענקים לפי מדרג פעילות',
    body: 'מ-10 ימים ומעלה נפתחים מענקי משפחה, הוצאות אישיות, ארנק דיגיטלי ושובר נופש — לפי מדרג הימים. בודקים באזור האישי במיל"ם.',
  },
  {
    title: 'מלגות ודחיית לימודים',
    body: 'סטודנטים שנקראו למילואים זכאים למלגה, למועדי ב׳ ולדחיית תשלומים במוסד הלימודים.',
  },
  {
    title: 'החזר מס 6 שנים אחורה',
    body: 'לא מימשתם נקודות זיכוי בשנה קודמת? מגישים דוח ומקבלים החזר. אישור שירות: מוקד 1111, שלוחה 4.',
  },
];
