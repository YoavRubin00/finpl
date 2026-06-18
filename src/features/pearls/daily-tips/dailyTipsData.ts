/**
 * Daily financial TIPS — the "טיפ של היום" knowledge card shown inside pearls,
 * in the same punchy, actionable voice בר (the CMO) prepares for the FinPlay
 * WhatsApp community every morning. Plural / gender-free per docs/BRAND.md,
 * no shark emoji, one clear takeaway each. Picked deterministically per day
 * (see getDailyTip) so the whole community sees the same tip on the same date.
 */
export interface DailyTip {
  id: string;
  /** Punchy headline — the hook (≤ ~5 words). */
  titleHe: string;
  /** One short, actionable paragraph. */
  bodyHe: string;
  /** Tiny tag shown on the community pill. */
  tagHe: string;
}

export const DAILY_TIPS: readonly DailyTip[] = [
  {
    id: 'tip-50-30-20',
    titleHe: 'כלל ה-50/30/20',
    bodyHe: 'חלקו את המשכורת: 50% להכרחי, 30% לכיף, 20% לחיסכון והשקעה. פשוט, וזה עובד.',
    tagHe: 'תקציב',
  },
  {
    id: 'tip-pay-yourself-first',
    titleHe: 'תשלמו לעצמכם קודם',
    bodyHe: 'הוראת קבע לחיסכון ביום שהמשכורת נכנסת — לפני שהכסף "נעלם". מה שלא רואים, לא מבזבזים.',
    tagHe: 'הרגל',
  },
  {
    id: 'tip-emergency-fund',
    titleHe: 'קרן חירום',
    bodyHe: '3 עד 6 חודשי הוצאות בצד, נזיל. זה ההבדל בין תקלה קטנה לבין אוברדרפט.',
    tagHe: 'ביטחון',
  },
  {
    id: 'tip-compound',
    titleHe: 'ריבית דריבית',
    bodyHe: 'הזמן עושה את העבודה. 100 ש"ח שמושקעים היום שווים הרבה יותר מ-100 ש"ח בעוד עשור.',
    tagHe: 'השקעה',
  },
  {
    id: 'tip-fees',
    titleHe: 'דמי ניהול קטנים = הרבה כסף',
    bodyHe: 'הבדל של אחוז אחד בדמי ניהול יכול לעלות לכם עשרות אלפי שקלים לאורך השנים. בדקו אותם.',
    tagHe: 'פנסיה',
  },
  {
    id: 'tip-index',
    titleHe: 'מדד רחב במקום לנחש',
    bodyHe: 'במקום לנסות לבחור מניה מנצחת — מדד מנייתי רחב מפזר את הסיכון בשבילכם.',
    tagHe: 'השקעה',
  },
  {
    id: 'tip-high-interest-debt',
    titleHe: 'חוב יקר — לסגור ראשון',
    bodyHe: 'אוברדרפט ואשראי בריבית גבוהה "אוכלים" כל חיסכון. סגרו אותם לפני שמשקיעים.',
    tagHe: 'חוב',
  },
  {
    id: 'tip-inflation',
    titleHe: 'מזומן מתחת לבלטות מפסיד',
    bodyHe: 'אינפלציה שוחקת כסף ששוכב בצד. לאורך זמן, להשאיר הכל במזומן זה הפסד שקט.',
    tagHe: 'מאקרו',
  },
  {
    id: 'tip-automate',
    titleHe: 'הפכו חיסכון לאוטומטי',
    bodyHe: 'הוראת קבע אחת = החלטה אחת לכל החיים, במקום החלטה כל חודש מחדש. תנו לאוטומציה לנצח.',
    tagHe: 'הרגל',
  },
  {
    id: 'tip-compare-loans',
    titleHe: 'משווים לפני שלוקחים',
    bodyHe: 'לפני כל הלוואה — השוו ריביות בכמה מקומות. דקה של בדיקה שווה לפעמים אלפי שקלים.',
    tagHe: 'אשראי',
  },
  {
    id: 'tip-pension-track',
    titleHe: 'בדקו את מסלול הפנסיה',
    bodyHe: 'מסלול ההשקעה ודמי הניהול בפנסיה משפיעים יותר מכל "טיפ" אחר. שווה 10 דקות בשנה.',
    tagHe: 'פנסיה',
  },
  {
    id: 'tip-credit-vs-debit',
    titleHe: 'אשראי מול דביט',
    bodyHe: 'דביט יורד מיד מהחשבון, אשראי נצבר לסוף החודש. דעו במה אתם משלמים — ואל תיכנסו למינוס.',
    tagHe: 'יומיום',
  },
  {
    id: 'tip-24h-rule',
    titleHe: 'כלל 24 השעות',
    bodyHe: 'לפני קנייה גדולה ולא מתוכננת — חכו יום. רוב הרצונות מתפוגגים, והכסף נשאר אצלכם.',
    tagHe: 'הרגל',
  },
  {
    id: 'tip-track-spending',
    titleHe: 'מה שמודדים, משתפר',
    bodyHe: 'שבוע אחד של מעקב אחרי כל הוצאה יחשוף לכם איפה הכסף בורח. אי אפשר לשפר מה שלא רואים.',
    tagHe: 'תקציב',
  },
];

/** A fresh tip on every pearl open (Yoav 18/06: "כל פעם יתחלף"). Random pick
 *  from the LOCAL fallback set. Once cloud tips are wired this is replaced by a
 *  server fetch — see getRemoteTips() consumers. */
export function getDailyTip(): DailyTip {
  const i = Math.floor(Math.random() * DAILY_TIPS.length);
  return DAILY_TIPS[i];
}