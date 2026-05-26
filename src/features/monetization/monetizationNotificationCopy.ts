import type { GatedFeature } from '../subscription/subscriptionConstants';

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
  "shark-voice": [
    { title: "🎙️ קפטן שארק רוצה לדבר", body: "ב-PRO שיחת קול חיה עם השארק — עשר דקות ביום, בלי הקלדה" },
    { title: "📞 פתחו את הקול שלי", body: "שיחה אחד-על-אחד עם קפטן שארק זמינה ל-PRO. בואו לנסות" },
  ],
  "analyst-quick": [
    { title: "🔮 ניתוח מניה חינם נגמר", body: "שדרגו ל-PRO לניתוחים חינוכיים ללא הגבלה" },
    { title: "📊 שארק שלף את הטאבלט", body: "ב-PRO מנתחים כמה מניות שרוצים" },
  ],
  "analyst-deep": [
    { title: "🧠 ניתוח מעמיק נשמר ל-PRO", body: "Claude Opus 4.7 עם חשיבה מורחבת — שש שכבות ניתוח, בלי הגבלה" },
    { title: "🔬 ניתוח עומק זמין ל-PRO", body: "השארק יצלול עמוק לדוחות, פטנטים וסקטור. בלעדי ל-PRO" },
  ],
  "breaking-news": [
    { title: "🔥 רוצים לעקוב אחרי עוד מניות?", body: "ב-PRO מקבלים סיכום AI יומי על 5 מניות במקום אחת. כל בוקר ב-9" },
    { title: "📈 כל הפורטפוליו שלכם, סיכום אחד", body: "שדרגו ל-PRO ועקבו אחרי 5 מניות בו-זמנית עם מדד הייפ חברתי" },
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
