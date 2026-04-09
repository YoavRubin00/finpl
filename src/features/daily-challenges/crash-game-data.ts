/**
 * Crash Game ("מרוץ הריבית") — configuration
 * The multiplier ticks up from 1.00x. At a random point it "crashes".
 * The user must cash-out before the crash to keep the coins.
 */

export interface CrashRound {
  /** The multiplier at which the graph crashes (e.g. 2.4 means crash at 2.4x) */
  crashAt: number;
  /** Speed factor — higher = faster climb */
  speed: number;
  /** Educational tip shown after the round */
  tip: string;
}

/** Pre-seeded crash rounds — one per day, rotates */
export const CRASH_ROUNDS: CrashRound[] = [
  {
    crashAt: 1.6,
    speed: 1.0,
    tip: 'וורן באפט אמר: "היה פחדן כשאחרים חמדנים". מי שחמדן מדי — מתפוצץ.',
  },
  {
    crashAt: 3.2,
    speed: 0.8,
    tip: 'בועות מתנפחות לאט ומתפוצצות בשנייה. תמיד יש רגע שנראה "מאוחר מדי".',
  },
  {
    crashAt: 1.3,
    speed: 1.4,
    tip: 'לפעמים השוק קורס מהר מאוד. מי שלא שם Stop Loss — משלם את המחיר.',
  },
  {
    crashAt: 5.0,
    speed: 0.6,
    tip: 'בועת הדוט-קום ב-2000 הגיעה לשיאים מטורפים לפני הקריסה. רוב המשקיעים לא יצאו בזמן.',
  },
  {
    crashAt: 2.1,
    speed: 1.1,
    tip: 'רווח שלא מומש הוא לא רווח. "Cash Out" בזמן הנכון הוא מיומנות.',
  },
  {
    crashAt: 1.8,
    speed: 1.3,
    tip: 'הפסד של 50% דורש רווח של 100% כדי להחזיר את הכסף. קודם תשמור על ההון.',
  },
  {
    crashAt: 4.1,
    speed: 0.7,
    tip: 'כשכולם מרגישים שזה "הולך רק למעלה" — זה בדיוק הזמן הכי מסוכן.',
  },
  {
    crashAt: 1.5,
    speed: 1.5,
    tip: 'Flash Crash: ב-6 במאי 2010 ה-Dow Jones צנח כ-1,000 נקודות (9%) תוך דקות ספורות. המהירות תמיד מפתיעה.',
  },
  {
    crashAt: 2.8,
    speed: 0.9,
    tip: 'פיזור השקעות מקטין סיכון. אל תשים את כל הביצים בסל אחד — גם לא בסל שנראה מבטיח.',
  },
  {
    crashAt: 6.5,
    speed: 0.5,
    tip: 'ביטקוין הגיע לשיא של $20,000 בדצמבר 2017 וצנח 80% במהלך 2018. מי שיצא בזמן חגג — מי שחיכה נשרף.',
  },
  {
    crashAt: 1.4,
    speed: 1.6,
    tip: 'יום שני השחור (1987): הדאו ג\'ונס צנח 22.6% ביום אחד — הירידה הגדולה ביותר בהיסטוריה. אף אחד לא ציפה לזה.',
  },
  {
    crashAt: 7.8,
    speed: 0.4,
    tip: 'הבועה היפנית (1990): מדד הניקיי הגיע ל-39,000 נקודות וצנח ל-7,000. היפנים חיכו 34 שנה עד שהמדד חזר לשיא.',
  },
  {
    crashAt: 2.5,
    speed: 1.0,
    tip: 'LTCM (1998): קרן גידור עם חתני פרס נובל פשטה רגל. מינוף קיצוני של 25:1 הפך רווח למפולת.',
  },
  {
    crashAt: 1.2,
    speed: 1.8,
    tip: 'אנרון (2001): מניה שנסחרה ב-$90 ירדה לאפס תוך חודשים. כשההנהלה משקרת — התרסקות מובטחת.',
  },
  {
    crashAt: 3.8,
    speed: 0.75,
    tip: 'Bear Stearns (2008): בנק השקעות בן 85 שנה קרס תוך שבוע. נמכר ב-$2 למניה — אחרי שנסחר ב-$170.',
  },
  {
    crashAt: 1.9,
    speed: 1.2,
    tip: 'המשבר היווני (2011): יוון כמעט פשטה רגל. הבורסה באתונה צנחה 90% מהשיא. חוב ממשלתי מופרז הוא פצצה מתקתקת.',
  },
  {
    crashAt: 4.5,
    speed: 0.65,
    tip: 'GameStop (2021): המניה זינקה מ-$20 ל-$483 ובחזרה. מי שקנה בשיא הפסיד 90%. FOMO הורג תיקים.',
  },
  {
    crashAt: 2.3,
    speed: 1.15,
    tip: 'Luna/Terra (2022): מטבע "יציב" שהבטיח 20% תשואה התאפס ביומיים. $40 מיליארד נמחקו. אין דבר כזה "ללא סיכון".',
  },
  {
    crashAt: 1.7,
    speed: 1.35,
    tip: 'SVB (2023): Silicon Valley Bank קרס תוך 48 שעות אחרי ריצה על הבנק. גם בנקים "בטוחים" יכולים להתרסק.',
  },
  {
    crashAt: 3.5,
    speed: 0.85,
    tip: 'המפולת הסינית (2015): בורסת שנגחאי צנחה 45% תוך חודשיים. מסחר במרווח (מינוף) הפך משקיעים סינים לחסרי כל.',
  },
];

/** Get today's crash round */
export function getTodayCrashRound(): CrashRound {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return CRASH_ROUNDS[dayIndex % CRASH_ROUNDS.length];
}
