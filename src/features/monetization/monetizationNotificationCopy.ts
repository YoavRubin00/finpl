import type { GatedFeature } from '../subscription/useSubscriptionStore';

interface NotifCopy {
  title: string;
  body: string;
}

type CopyPool = readonly NotifCopy[];

const UPGRADE_COPY: Record<GatedFeature | 'default', CopyPool> = {
  aiInsights: [
    { title: "🧠 יש לי 3 תובנות חדשות עליך", body: "הן ממתינות מאחורי מסך נעול. ב-PRO תגלה מה קפטן שארק באמת חושב עליך" },
    { title: "💡 הניתוח שלך מוכן", body: "כתבתי תובנות אישיות עליך. אבל הן ל-PRO בלבד. בוא לראות?" },
  ],
  chat: [
    { title: "🦈 קפטן שארק מחכה לך", body: "ניסית לשוח איתי אבל נגמרו ההודעות. ב-PRO מדברים כמה שרוצים 😏" },
    { title: "💬 יש לי עוד מה להגיד לך", body: "ב-PRO אין גבול להודעות. שדרג ותגלה" },
  ],
  simulator: [
    { title: "📊 עוד סימולציות ממתינות", body: "ניסית להכנס אבל הגעת למגבלה. ב-PRO המשחק נפתח לגמרי" },
    { title: "🎮 הסימולציה הבאה נעולה", body: "קפטן שארק יודע שאתה רוצה לנסות. ב-PRO — ללא הגבלה" },
  ],
  arena: [
    { title: "⚡ עוד קרבות מחכים לך", body: "הגעת למגבלת הכניסות. ב-PRO הזירה פתוחה 24/7" },
    { title: "🏆 הרצף שלך בזירה לא נגמר ב-PRO", body: "שדרג וחזור לקרב" },
  ],
  saved_items: [
    { title: "🔖 לשמור בלי גבולות — זה PRO", body: "ב-PRO שומרים כמה שרוצים. בלי מגבלות" },
    { title: "💾 שמרת הרבה — כמעט מלא", body: "ב-PRO תוכל לשמור כל מה שתרצה. שדרג?" },
  ],
  default: [
    { title: "🦈 קפטן שארק שם לב אליך", body: "ניסית להשתמש בפיצ'רים PRO כמה פעמים. בוא נסגור את זה?" },
    { title: "💎 כמעט PRO — זה ניכר", body: "רואים בך מישהו שרוצה יותר. שדרג ותקבל הכל" },
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
