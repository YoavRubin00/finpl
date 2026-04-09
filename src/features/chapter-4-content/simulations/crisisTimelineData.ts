/**
 * SIM: ציר הזמן של המשברים — Crisis Timeline
 * Data: 7 real historical crises with actual S&P 500 data.
 */

import type { CrisisEvent } from './crisisTimelineTypes';

export const CRISIS_EVENTS: CrisisEvent[] = [
  {
    id: 'great-depression',
    year: 1929,
    name: 'השפל הגדול',
    emoji: '🏚️',
    peakToTrough: -89,
    recoveryMonths: 303,
    spLevel: 4.4,
    description:
      'קריסת וול סטריט באוקטובר 1929 הובילה לשפל הכלכלי הגדול בהיסטוריה. מיליוני אמריקאים איבדו את חסכונותיהם.',
    grahamLesson:
      'גראהם למד מהמשבר: קנה רק עם מרווח ביטחון גדול. אל תשתמש במינוף. הפסד גדול דורש רווח הרבה יותר גדול כדי להתאושש.',
    crowdAction:
      'ההמון מכר בפאניקה. אנשים משכו כסף מהבנקים. בנקים קרסו. אבטלה הגיעה ל-25%.',
    surprisingFact:
      'מי שהשקיע בשפל של 1932 והחזיק 5 שנים — הרוויח כ-300%. הסבלנות שילמה.',
  },
  {
    id: 'oil-crisis',
    year: 1973,
    name: 'משבר הנפט',
    emoji: '🛢️',
    peakToTrough: -48,
    recoveryMonths: 69,
    spLevel: 62,
    description:
      'מדינות אופ"ק הטילו אמברגו על נפט. מחיר הנפט זינק פי 4. אינפלציה דו-ספרתית שיתקה את הכלכלה.',
    grahamLesson:
      'גראהם היה אומר: חברות עם יתרון תחרותי שורדות כל משבר. חפש עסקים חזקים במחירי מציאה.',
    crowdAction:
      'משקיעים ברחו לזהב ונדל"ן. שוק המניות נזנח לשנים. פסימיות קיצונית.',
    surprisingFact:
      'וורן באפט, תלמידו של גראהם, קנה מניות בזול במהלך המשבר ובנה את הבסיס להון העתק שלו.',
  },
  {
    id: 'black-monday',
    year: 1987,
    name: 'יום שני השחור',
    emoji: '📉',
    peakToTrough: -34,
    recoveryMonths: 20,
    spLevel: 224,
    description:
      'ב-19 באוקטובר 1987 הדאו צנח 22.6% ביום אחד — הירידה היומית הגדולה בהיסטוריה. מסחר ממוחשב החריף את הנפילה.',
    grahamLesson:
      'גראהם היה מזכיר: מר שוק הוא רגשני. ביום אחד הוא אופטימי, למחרת פסימי. אל תתנו לו לקבוע את ההחלטות שלכם.',
    crowdAction:
      'פאניקה מוחלטת. פקודות מכירה אוטומטיות גרמו לאפקט דומינו. אנשים חשבו שהעולם נגמר.',
    surprisingFact:
      'השוק התאושש תוך שנתיים בלבד. מי שמכר ביום שני השחור — הפסיד את אחת ההתאוששויות המהירות בהיסטוריה.',
  },
  {
    id: 'dotcom',
    year: 2000,
    name: 'בועת הדוט-קום',
    emoji: '💻',
    peakToTrough: -49,
    recoveryMonths: 84,
    spLevel: 776,
    description:
      'חברות אינטרנט ללא רווחים נסחרו במכפילים מטורפים. כשהבועה פקעה, טריליונים נמחקו. חברות כמו Pets.com נעלמו.',
    grahamLesson:
      'גראהם היה אומר: מחיר הוא מה שאתה משלם, ערך הוא מה שאתה מקבל. אם אין רווחים — אין ערך אמיתי.',
    crowdAction:
      'כולם קנו מניות טכנולוגיה בלי לבדוק מאזנים. נהגי מוניות נתנו טיפים למניות. אופוריה מוחלטת.',
    surprisingFact:
      'אמזון איבדה 95% מערכה אבל שרדה. מי שהחזיק — הרוויח פי 500+ עד 2020. בחירת חברות איכותיות משנה הכל.',
  },
  {
    id: 'financial-crisis',
    year: 2008,
    name: 'המשבר הפיננסי',
    emoji: '🏦',
    peakToTrough: -57,
    recoveryMonths: 65,
    spLevel: 666,
    description:
      'בועת הנדל"ן בארה"ב התפוצצה. בנקים ענקיים כמו ליהמן בראדרס קרסו. המשבר התפשט לכל העולם.',
    grahamLesson:
      'גראהם היה מדגיש: פיזור הוא הגנה. אל תרכז הכל בנכס אחד. מי שהיה מפוזר — ספג מכה קטנה יותר.',
    crowdAction:
      'מכירות פאניקה בכל העולם. אנשים משכו כסף מקרנות. ממשלות חילצו בנקים עם כסף ציבורי.',
    surprisingFact:
      'S&P 500 נגע ב-666 (בדיוק!) במרץ 2009. משם הוא עלה כ-400% תוך עשור. הפחד הגדול ביותר = ההזדמנות הגדולה ביותר.',
  },
  {
    id: 'covid',
    year: 2020,
    name: 'משבר הקורונה',
    emoji: '🦠',
    peakToTrough: -34,
    recoveryMonths: 5,
    spLevel: 2237,
    description:
      'מגפה עולמית סגרה כלכלות שלמות. השוק צנח 34% ב-23 ימי מסחר בלבד — המהירות הגבוהה בהיסטוריה.',
    grahamLesson:
      'גראהם היה אומר: שוק דובי הוא חבר של המשקיע לטווח ארוך. קנה כשכולם מפחדים.',
    crowdAction:
      'מיליוני משקיעים חדשים (דור TikTok) נכנסו לשוק דרך אפליקציות. מכירות פאניקה של הוותיקים = הזדמנות לצעירים.',
    surprisingFact:
      'השוק התאושש תוך 5 חודשים בלבד — ההתאוששות המהירה ביותר מירידה של 30%+. מי שמכר — הפסיד את הקאמבק.',
  },
  {
    id: 'rate-hikes',
    year: 2022,
    name: 'עליית הריבית',
    emoji: '📊',
    peakToTrough: -25,
    recoveryMonths: 22,
    spLevel: 3491,
    description:
      'הפד העלה ריבית מ-0% ל-5.5% כדי להילחם באינפלציה. מניות טכנולוגיה נפגעו קשה. שוק האג"ח חווה את השנה הגרועה בהיסטוריה.',
    grahamLesson:
      'גראהם היה מזכיר: ריבית גבוהה = מחירי מניות נמוכים יותר. זה לא באג, זה פיצ\'ר — הזדמנות לקנות.',
    crowdAction:
      'משקיעים ברחו מטכנולוגיה לחשבונות חיסכון בריבית גבוהה. קריפטו קרס. פסימיות לגבי העתיד.',
    surprisingFact:
      'מי שהשקיע ב-S&P 500 בתחתית של 2022 הרוויח 40%+ תוך שנתיים. שוב — הפחד יצר הזדמנות.',
  },
];

// ── Prediction accuracy bands ────────────────────────────────────────────

export function calculateAccuracy(predicted: number, actual: number): number {
  if (actual === 0) return predicted === 0 ? 100 : 20;
  const ratio = Math.abs(predicted - actual) / actual;
  if (ratio <= 0.20) return 100;
  if (ratio <= 0.50) return 70;
  if (ratio <= 1.00) return 40;
  return 20;
}

// ── Grade from average accuracy ──────────────────────────────────────────

export function calculateTimelineGrade(avgAccuracy: number): 'S' | 'A' | 'B' | 'C' | 'F' {
  if (avgAccuracy >= 85) return 'S';
  if (avgAccuracy >= 70) return 'A';
  if (avgAccuracy >= 55) return 'B';
  if (avgAccuracy >= 40) return 'C';
  return 'F';
}
