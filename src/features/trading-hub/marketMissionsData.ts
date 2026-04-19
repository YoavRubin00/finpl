export type MarketMissionKind =
  | 'view-weekly'
  | 'switch-asset'
  | 'star-asset'
  | 'view-chart'
  | 'compare-prices'
  | 'check-volatility';

export interface MarketMission {
  id: string;
  titleHe: string;
  descriptionHe: string;
  sharkPraiseHe: string;
  kind: MarketMissionKind;
}

export const MARKET_MISSIONS: MarketMission[] = [
  // ── view-weekly variants ────────────────────────────────────────────────
  {
    id: 'mm-weekly-view',
    titleHe: 'הצץ בגרף שבועי',
    descriptionHe: 'החלף את הטווח בכרטיס הגרף ל"שבוע" וראה איך הסיפור משתנה.',
    sharkPraiseHe: '💪 יפה. שבועי = פחות רעש, יותר מגמה.',
    kind: 'view-weekly',
  },
  {
    id: 'mm-weekly-trend',
    titleHe: 'בחן מגמה שבועית',
    descriptionHe: 'החלף לטווח שבועי וזהה אם הנכס במגמת עלייה או ירידה.',
    sharkPraiseHe: '📈 חידוד מצוין. חודש שלם בעין אחת.',
    kind: 'view-weekly',
  },
  {
    id: 'mm-weekly-perspective',
    titleHe: 'תפנה לטווח השבועי לרגע',
    descriptionHe: 'קל לטעות בקריאת מגמה ביום. בשבוע מסתכלים אחרת.',
    sharkPraiseHe: '🌅 בדיוק. מי שמרחיק עין רואה תמונה רחבה.',
    kind: 'view-weekly',
  },

  // ── switch-asset variants ───────────────────────────────────────────────
  {
    id: 'mm-explore-asset',
    titleHe: 'גלה נכס חדש',
    descriptionHe: 'בחר נכס שלא בחנת היום וראה את המחיר שלו.',
    sharkPraiseHe: '🎯 כל מסך חדש שאתה לומד, מבטל הפתעה עתידית.',
    kind: 'switch-asset',
  },
  {
    id: 'mm-explore-second',
    titleHe: 'נסה נכס אחר היום',
    descriptionHe: 'אל תיתקע על אותו טיקר. גלה משהו חדש בקרוסלה.',
    sharkPraiseHe: '🌟 כל אסטרטגיה טובה מתחילה בסקרנות.',
    kind: 'switch-asset',
  },
  {
    id: 'mm-explore-etf',
    titleHe: 'בחן ETF היום',
    descriptionHe: 'תעודת סל = פיזור בלחיצה. בחר SPY או QQQ והסתכל.',
    sharkPraiseHe: '📊 חכם. ETF זה הצעד הכי אינטליגנטי למתחיל.',
    kind: 'switch-asset',
  },
  {
    id: 'mm-explore-commodity',
    titleHe: 'הצץ בסחורה',
    descriptionHe: 'בחר זהב או כסף. אלה תזוזות שונות לחלוטין מהמניות.',
    sharkPraiseHe: '🪙 מעולה. סחורות מלמדות אותך על העולם, לא רק על השוק.',
    kind: 'switch-asset',
  },

  // ── star-asset variants ─────────────────────────────────────────────────
  {
    id: 'mm-star-favorite',
    titleHe: 'סמן נכס בכוכב',
    descriptionHe: 'הוסף נכס אחד לרשימת המעקב שלך, לחיצה ארוכה על הקרוסלה.',
    sharkPraiseHe: '⭐ מעולה. רשימת מעקב = פחות רעש בעין, יותר מיקוד.',
    kind: 'star-asset',
  },
  {
    id: 'mm-star-curate',
    titleHe: 'תקצר את רשימת המעקב',
    descriptionHe: 'סמן נכס שבאמת מעניין אותך. עדיף 3 שבעיון מ-15 שטחי.',
    sharkPraiseHe: '🎯 בדיוק. מיקוד שווה זהב.',
    kind: 'star-asset',
  },

  // ── view-chart variants ─────────────────────────────────────────────────
  {
    id: 'mm-watch-chart',
    titleHe: 'התבונן בגרף 3 שניות',
    descriptionHe: 'פשוט תסתכל. סבלנות זו השריר שמרוויח לך כסף לאורך שנים.',
    sharkPraiseHe: '🧘 כל הכבוד. מי שצופה, לומד בלי שיודע.',
    kind: 'view-chart',
  },
  {
    id: 'mm-watch-pattern',
    titleHe: 'חפש דפוס בגרף',
    descriptionHe: 'תסתכל על הקו. מגמה? צד? שפלים? פסגות? פשוט שים לב.',
    sharkPraiseHe: '👁️ נהדר. עין מאומנת רואה דברים שמחשב מפספס.',
    kind: 'view-chart',
  },
  {
    id: 'mm-watch-calm',
    titleHe: 'נשום ותסתכל',
    descriptionHe: '3 שניות של התבוננות שקטה. בלי לחשוב על קנייה, רק להבחין.',
    sharkPraiseHe: '🌊 כן. שוק לא דורש פעולה, דורש תשומת לב.',
    kind: 'view-chart',
  },

  // ── compare-prices variants ─────────────────────────────────────────────
  {
    id: 'mm-compare-two',
    titleHe: 'השווה בין שני נכסים',
    descriptionHe: 'בחר נכס, אחר כך נכס שני בתוך 10 שניות. תרגיל פיזור בלי כסף.',
    sharkPraiseHe: '🔍 בדיוק. השוואה = הצעד הראשון לבחירה חכמה.',
    kind: 'compare-prices',
  },
  {
    id: 'mm-compare-stock-etf',
    titleHe: 'מנייה מול תעודת סל',
    descriptionHe: 'בחר מנייה, אחרי SPY או QQQ. ראה כמה אחת מסוכנת מהשנייה.',
    sharkPraiseHe: '🧠 הבנת הגדולה: ETF = פיזור, מנייה = ריכוז.',
    kind: 'compare-prices',
  },
  {
    id: 'mm-compare-volatility',
    titleHe: 'נכס שקט מול נכס פראי',
    descriptionHe: 'בחר נכס בנקודה ירוקה, ואז נכס באדום או רקטה. הבדל מורגש.',
    sharkPraiseHe: '🌗 בדיוק. תנודתיות שונה = פסיכולוגיה שונה.',
    kind: 'compare-prices',
  },

  // ── check-volatility variants ───────────────────────────────────────────
  {
    id: 'mm-tap-volatility',
    titleHe: 'בדוק רמת תנודתיות',
    descriptionHe: 'לחץ על נקודת התנודתיות ליד נכס בקרוסלה כדי להבין כמה הוא "פראי".',
    sharkPraiseHe: '🌊 נכון. תנודתיות גבוהה = ריגושים, אבל גם סיכון.',
    kind: 'check-volatility',
  },
  {
    id: 'mm-volatility-extreme',
    titleHe: 'מצא נכס "קיצוני" 🚀',
    descriptionHe: 'חפש בקרוסלה נכס עם הסימון הזה ולחץ עליו. מי הוא? למה הוא כזה?',
    sharkPraiseHe: '🚀 כן. קיצוני = שלא בא ב-100 שח לפני שלמדת.',
    kind: 'check-volatility',
  },
  {
    id: 'mm-volatility-low',
    titleHe: 'מצא נכס שקט 🟢',
    descriptionHe: 'חפש בקרוסלה את הסימון הירוק. אלה הנכסים הבסיסיים.',
    sharkPraiseHe: '🌳 הבחירה הבטוחה. שקט בשוק = שקט בלילה.',
    kind: 'check-volatility',
  },
];

/**
 * Picks today's mission deterministically, same calendar day → same mission.
 * Hash of ISO date string mod pool length.
 */
export function pickMissionForDate(isoDate: string): MarketMission {
  let hash = 0;
  for (let i = 0; i < isoDate.length; i++) {
    hash = (hash * 31 + isoDate.charCodeAt(i)) >>> 0;
  }
  const idx = hash % MARKET_MISSIONS.length;
  return MARKET_MISSIONS[idx];
}
