import type { ActivePosition } from './tradingHubTypes';

export type SharkTipMood = 'beginner' | 'patience' | 'discipline' | 'streak' | 'general';

export interface SharkTip {
  id: string;
  mood: SharkTipMood;
  textHe: string;
}

export const SHARK_TIPS: SharkTip[] = [
  // Beginner — empty portfolio
  { id: 'beg-1', mood: 'beginner', textHe: 'התחל קטן. אפילו 100 מטבעות ב-SPY מלמדים יותר מאלף סרטונים.' },
  { id: 'beg-2', mood: 'beginner', textHe: 'מדדים (SPY, QQQ) הם הבסיס — פיזור מובנה בלי הימור על מנייה אחת.' },
  { id: 'beg-3', mood: 'beginner', textHe: 'אל תחפש את "המנייה המנצחת". חפש להבין את הגרף.' },

  // Patience — when user has profitable positions
  { id: 'pat-1', mood: 'patience', textHe: '+5% רווח יפה. שאל את עצמך: הסיבה שקניתי עדיין תקפה? אם כן — המשך. אם לא — צא.' },
  { id: 'pat-2', mood: 'patience', textHe: 'הזמן הוא חבר של מי שיודע לחכות. בדוק שוב מחר.' },
  { id: 'pat-3', mood: 'patience', textHe: 'הרווחים הגדולים באים מאחיזה ארוכה, לא מחיתוך מהיר.' },

  // Discipline — when user has losing positions
  { id: 'dis-1', mood: 'discipline', textHe: 'יורד? זה חלק מהמשחק. השאלה היחידה: הסיבה לקנייה עדיין תקפה?' },
  { id: 'dis-2', mood: 'discipline', textHe: 'אל תמכור בפאניקה — אבל גם אל תחזיק בעיקשות. בחן את הנימוקים שוב.' },
  { id: 'dis-3', mood: 'discipline', textHe: 'תנודתיות זה לא אסון — זה הסיבה שיש בכלל תשואה.' },

  // Streak — engaged users
  { id: 'str-1', mood: 'streak', textHe: 'רצף יפה. ההרגל הוא העושר האמיתי.' },
  { id: 'str-2', mood: 'streak', textHe: 'משקיעים שמגיעים כל יום מנצחים אלה שמגיעים כשמתחשק להם.' },

  // General — daily fallback
  { id: 'gen-1', mood: 'general', textHe: 'גרף שבועי מספר אמת שונה מגרף יומי. שווה הצצה.' },
  { id: 'gen-2', mood: 'general', textHe: 'תנודתיות גבוהה = הזדמנויות גבוהות, אבל גם סיכון גבוה. בחר במודע.' },
  { id: 'gen-3', mood: 'general', textHe: 'זהב נוטה להיות הפוך מהשוק בתקופות משבר — אבל לא תמיד.' },
  { id: 'gen-4', mood: 'general', textHe: 'מי שיודע מה הוא קונה — לא נבהל כשהמחיר זז.' },
  { id: 'gen-5', mood: 'general', textHe: 'אל תחקה — תלמד. כל אחד בא עם פרופיל סיכון אחר.' },
  { id: 'gen-6', mood: 'general', textHe: 'פיזור זה לא משעמם — זו התובנה הכי חשובה בהשקעות.' },
  { id: 'gen-7', mood: 'general', textHe: 'מחיר זה לא ערך. למד את ההבדל — ותרוויח לכל החיים.' },
  { id: 'gen-8', mood: 'general', textHe: '"השוק קצר-טווח הוא הצבעה. ארוך-טווח הוא משקל" — Benjamin Graham.' },
];

export interface SharkTipContext {
  isoDate: string;
  positions: ActivePosition[];
  streak: number;
}

/**
 * Picks a Shark tip deterministically per day based on user context.
 * Same date + same context → same tip (so the user doesn't see it shuffle on every render).
 */
export function pickSharkTip(ctx: SharkTipContext): SharkTip {
  const mood = pickMood(ctx);
  const pool = SHARK_TIPS.filter((t) => t.mood === mood);
  const fallback = SHARK_TIPS.filter((t) => t.mood === 'general');
  const candidates = pool.length > 0 ? pool : fallback;
  let hash = 0;
  const seed = `${ctx.isoDate}|${mood}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return candidates[hash % candidates.length];
}

function pickMood(ctx: SharkTipContext): SharkTipMood {
  if (ctx.positions.length === 0) return 'beginner';
  const hasBigGainer = ctx.positions.some((p) => p.pnlPercent >= 5);
  const hasBigLoser = ctx.positions.some((p) => p.pnlPercent <= -5);
  if (hasBigLoser) return 'discipline';
  if (hasBigGainer) return 'patience';
  if (ctx.streak >= 3) return 'streak';
  return 'general';
}
