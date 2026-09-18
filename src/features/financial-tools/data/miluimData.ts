/**
 * מילואים 2026 — the numbers behind MiluimCalculator.
 *
 * ⚠️ FACT-GATED (Yoav 18.9.26): every figure below must match
 * docs/content/FACTS-2026-09-trends.md (חוקרון-verified). Update BOTH when
 * the law changes. Sources inline.
 */

export type MiluimRole = 'combat' | 'combat_support' | 'rear';

export const MILUIM_ROLE_LABEL: Record<MiluimRole, string> = {
  combat: 'לוחם/ת',
  combat_support: 'תומך/ת לחימה',
  rear: 'עורפי',
};

/** Facts freshness stamp shown in the disclaimer. */
export const MILUIM_FACTS_ASOF = 'ספטמבר 2026';

/** Value of one tax-credit point, tax year 2026.
 *  // source: רשות המסים, סכומים לשנת המס 2026 — ₪242/חודש = ₪2,904/שנה */
export const CREDIT_POINT_VALUE_2026 = 2904;

/**
 * Reservist credit-point ladder for tax years 2026–2027 (service in the
 * PREVIOUS calendar year, combat + combat-support only).
 *   30–39 days → ½ point · 40–49 → ¾ · 50–69 → 1 · then +1 per 20 days, cap 4.
 *  // source: חוק הטבות למשרתי מילואים (הוראת שעה) 2025; Bizportal "מפת הכסף" 2026
 */
export function creditPointsForDays(days: number, role: MiluimRole): number {
  if (role === 'rear') return 0;
  if (days < 30) return 0;
  if (days < 40) return 0.5;
  if (days < 50) return 0.75;
  const extra = Math.floor((days - 50) / 20);
  return Math.min(4, 1 + extra);
}

/**
 * Special reserve-days grant ladder (ביטוח לאומי, per calendar year).
 * ⚠️ tiers pending חוקרון confirmation — structure verified, amounts to
 * be reconciled against miluim.idf.il 2026 policy.
 *  // source: miluim.idf.il/articles-list/מדיניות-2026 ; כל-זכות "מענק מילואים"
 */
const GRANT_LADDER: ReadonlyArray<{ minDays: number; grant: number }> = [
  { minDays: 10, grant: 1_410 },
  { minDays: 20, grant: 2_820 },
  { minDays: 30, grant: 4_230 },
  { minDays: 40, grant: 5_640 },
];

export function grantForDays(days: number): number {
  let g = 0;
  for (const tier of GRANT_LADDER) if (days >= tier.minDays) g = tier.grant;
  return g;
}

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
  if (role === 'rear' && days >= 30) {
    notes.push('נקודות הזיכוי המוגדלות ניתנות ללוחמים ולתומכי לחימה. עורפיים זכאים למענקים ולהטבות האחרות.');
  }
  if (creditPoints > 0) {
    notes.push('נקודות הזיכוי מקטינות את המס — הן שוות כסף רק אם יש לכם מס לשלם באותה שנה.');
  }
  return { creditPoints, creditPointsValue, grant, totalValue: creditPointsValue + grant, notes };
}

/** Benefits most reservists never claim. Copy = system voice (plural). */
export const MILUIM_BENEFITS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'קדימות ב"דירה בהנחה"',
    body: 'חלק מהדירות בכל הגרלה שמור למשרתי מילואים. נרשמים באתר דירה בהנחה עם אישור צה"ל.',
  },
  {
    title: 'הנחה בארנונה',
    body: 'רוב הרשויות נותנות הנחה למי ששירת מעל סף ימים. מגישים בקשה לרשות המקומית עם אישור שירות.',
  },
  {
    title: 'מלגות ודחיית לימודים',
    body: 'סטודנטים שנקראו למילואים זכאים למלגה, למועדי ב׳ ולדחיית תשלומים במוסד הלימודים.',
  },
  {
    title: 'תגמול יומי מביטוח לאומי',
    body: 'על כל יום שירות משלמים לפי השכר שלכם, עם רצפה מינימלית גם למי שלא עבד. שכירים מקבלים דרך המעסיק.',
  },
];
