import type { GatedFeature } from '../subscription/useSubscriptionStore';

interface NotifCopy {
  title: string;
  body: string;
}

type CopyPool = readonly NotifCopy[];

const UPGRADE_COPY: Record<GatedFeature | 'default', CopyPool> = {
  aiInsights: [
    { title: "🧠 יש לי 3 תובנות חדשות עליכם", body: "הן ממתינות מאחורי מסך נעול. ב-PRO תגלו מה קפטן שארק באמת חושב עליכם" },
    { title: "💡 הניתוח שלכם מחכה", body: "כתבתי תובנות אישיות עליכם. אבל הן ל-PRO בלבד. בואו לראות?" },
  ],
  chat: [
    { title: "🦈 קפטן שארק מחכה לכם", body: "ניסיתם לשוחח איתי אבל נגמרו ההודעות. ב-PRO מדברים כמה שרוצים 😏" },
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
  default: [
    { title: "🦈 קפטן שארק שם לב אליכם", body: "ניסיתם להשתמש בפיצ'רים PRO כמה פעמים. בואו נסגור את זה?" },
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
