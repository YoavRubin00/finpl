import type { GatedFeature } from '../subscription/subscriptionConstants';

interface NotifCopy {
  title: string;
  body: string;
}

type CopyPool = readonly NotifCopy[];

const UPGRADE_COPY: Record<GatedFeature | 'default', CopyPool> = {
  // R8 pre-release audit (Yoav + Audrey 2026-06-11): P0 — שני ה-copy
  // הקודמים מינפו דאטה אישי ("3 תובנות עליכם מאחורי מסך נעול" / "כתבתי
  // תובנות אישיות עליכם, אבל הן ל-PRO בלבד") כקלף סחיטה רגשי. גבול אדום
  // מותגי + חשיפת רגולציה. הוחלף ל-value framing על מה ש-AI Insights
  // עצמן עושות, בלי "אני יודע משהו עליך וזה נעול".
  aiInsights: [
    { title: "📊 AI Insights פתוח ב-PRO", body: "ניתוחי דפוסי הלמידה והמסחר שלכם — שבועיים אחורה, מה עבד ומה לא. שדרגו ל-PRO" },
    { title: "💡 רוצים לראות את הניתוח השבועי?", body: "AI Insights מסכם לכם איך עברה השבוע — שיעורים, מטבעות, רצף. זמין ב-PRO" },
  ],
  chat: [
    { title: "קפטן שארק מחכה לכם", body: "ניסיתם לשוחח איתי אבל נגמרו ההודעות. ב-PRO מדברים כמה שרוצים 😏" },
    { title: "💬 יש לי עוד מה להגיד לכם", body: "ב-PRO אין גבול להודעות. שדרגו ותגלו" },
  ],
  simulator: [
    { title: "📊 עוד סימולציות ממתינות", body: "ניסיתם להיכנס אבל הגעתם למגבלה. ב-PRO המשחק נפתח לגמרי" },
    { title: "🎮 הסימולציה הבאה נעולה", body: "קפטן שארק יודע שאתם רוצים לנסות. ב-PRO, ללא הגבלה" },
  ],
  arena: [
    { title: "⚡ עוד קרבות מחכים לכם", body: "הגעתם למגבלת הכניסות. ב-PRO הזירה פתוחה 24/7" },
    { title: "🏆 הרצף שלכם בזירה לא נגמר ב-PRO", body: "שדרגו וחזרו לקרב" },
  ],
  saved_items: [
    { title: "🔖 לשמור בלי גבולות, זה PRO", body: "ב-PRO שומרים כמה שרוצים. בלי מגבלות" },
    { title: "💾 שמרתם הרבה, כמעט מלא", body: "ב-PRO תוכלו לשמור כל מה שתרצו. שדרגו?" },
  ],
  "breaking-news": [
    { title: "📰 פתחתם רק חצי מהמתנה היומית", body: "תיבת ה‑Pro של האקטואליה הפיננסית נשארה סגורה. ב‑PRO היא נפתחת כל יום" },
    { title: "🎁 בונוס יומי ב‑PRO", body: "האתגר היומי פתוח לכולם, אבל תיבת הבונוס שמורה ל‑PRO. שדרגו וקבלו אותה כל בוקר" },
  ],
  "shark-voice": [
    { title: "📞 קפטן שארק מחכה לשיחה", body: "ניסיתם להתקשר אבל הדקה החינמית נגמרה. ב‑PRO 10 דק׳ ביום" },
    { title: "🗣️ דברו איתי קול", body: "ב‑PRO תוכלו לדבר איתי בקול עד 10 דק׳ ביום. שדרגו וניכנס לשיחה" },
  ],
  "analyst-quick": [
    { title: "📈 רוצים עוד מניות לנתח?", body: "הניתוח החינמי היומי שלכם נוצל. ב‑PRO לא נגמר אף פעם" },
    { title: "קפטן שארק יכול לנתח עוד", body: "שדרגו ל‑PRO לניתוחים בלתי מוגבלים על כל מניה" },
  ],
  "analyst-deep": [
    { title: "🔍 ניתוח עומק נעול", body: "follow-up, תזרימים, בדיקות שווי — 5 בשבוע ב‑PRO" },
    { title: "🧠 רוצים את הפרטים הקטנים?", body: "ניתוח העומק עם כל המידע שמור ל‑PRO. שדרגו ל-5 ניתוחים בשבוע" },
  ],
  payslip: [
    { title: "📄 רוצים לנתח עוד תלוש?", body: "הניתוח החודשי שלכם נוצל. ב‑PRO תלוש בכל פעם, בכל בונוס" },
    { title: "💸 בונוס נכנס? שינוי משרה?", body: "נתחתם תלוש החודש. ב‑PRO תוכלו לנתח עוד אחד עכשיו, בלי לחכות" },
  ],
  default: [
    { title: "קפטן שארק שם לב אליכם", body: "ניסיתם להשתמש בפיצ'רים PRO כמה פעמים. בואו נסגור את זה?" },
    { title: "💎 כמעט PRO, זה ניכר", body: "רואים בכם מישהו שרוצה יותר. שדרגו ותקבלו הכל" },
  ],
};

export function pickUpgradeNudgeCopy(
  lastFeature: GatedFeature | null,
  avoidTitle?: string | null,
): NotifCopy {
  const key = lastFeature ?? 'default';
  const pool = UPGRADE_COPY[key] ?? UPGRADE_COPY.default;

  if (pool.length === 1) return pool[0];

  const filtered = avoidTitle ? pool.filter((c) => c.title !== avoidTitle) : [...pool];
  const candidates = filtered.length > 0 ? filtered : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
