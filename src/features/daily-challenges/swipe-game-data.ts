/**
 * Swipe Game ("שורט או לונג") — card data
 * Each card presents a short macro headline. The user swipes right (Long/Buy) or left (Short/Sell).
 */

export type GraphicCategory = 'tech' | 'crisis' | 'bank' | 'scandal' | 'trade' | 'graham';

export interface SwipeCard {
  id: string;
  headline: string;
  emoji: string;
  imageCategory: GraphicCategory;
  /** true = Long is correct, false = Short is correct */
  correctIsLong: boolean;
  explanation: string;
}

export const SWIPE_CARDS: SwipeCard[] = [
  {
    id: 'sw-1',
    headline: 'חברת ביטוח גילתה תרמית הנהלה ענקית',
    emoji: '🚨',
    imageCategory: 'scandal',
    correctIsLong: false,
    explanation: 'תרמית הנהלה = פגיעה אמון → המניה צפויה לצנוח.',
  },
  {
    id: 'sw-2',
    headline: 'האינפלציה ירדה למטרת הבנק המרכזי',
    emoji: '📉',
    imageCategory: 'bank',
    correctIsLong: true,
    explanation: 'אינפלציה בשליטה = סביבה מושלמת לצמיחה כלכלית.',
  },
  {
    id: 'sw-3',
    headline: 'חברת תרופות קיבלה אישור FDA למוצר פורץ-דרך',
    emoji: '💊',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'אישור רגולטורי = פוטנציאל הכנסות עצום → עליית מניה.',
  },
  {
    id: 'sw-4',
    headline: 'מדינה מטילה מיסי יבוא כבדים על סחורות',
    emoji: '⚔️',
    imageCategory: 'trade',
    correctIsLong: false,
    explanation: 'מלחמת סחר פוגעת בשרשראות אספקה ומייקרת מוצרים.',
  },
  {
    id: 'sw-5',
    headline: 'ענקית טכנולוגיה פרסמה רבעון שיא ברווחים',
    emoji: '🚀',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'רווחי שיא = ביקוש גבוה למניה. עולה!',
  },
  {
    id: 'sw-6',
    headline: 'רעידת אדמה השמידה מפעלי ייצור שבבים באסיה',
    emoji: '🌋',
    imageCategory: 'crisis',
    correctIsLong: true,
    explanation: 'שיבוש שרשרת אספקה → מחסור בשבבים → כוח תמחור לספקים שנותרו ← מניות שבבים עולות!',
  },
  {
    id: 'sw-7',
    headline: 'הבנק המרכזי הפתיע עם הורדת ריבית דרמטית',
    emoji: '🏦',
    imageCategory: 'bank',
    correctIsLong: true,
    explanation: 'ריבית נמוכה = כסף זול = אנשים משקיעים יותר בשוק ← עלייה.',
  },
  {
    id: 'sw-8',
    headline: 'שביתה כללית של עובדי הובלה בנמלים',
    emoji: '🚢',
    imageCategory: 'trade',
    correctIsLong: false,
    explanation: 'עצירת שינוע = פגיעה כלכלית רחבה.',
  },
  {
    id: 'sw-9',
    headline: 'חברת AI חתמה על חוזה ממשלתי ענק',
    emoji: '🤖',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'חוזה ממשלתי = הכנסה מובטחת לשנים → עלייה.',
  },
  {
    id: 'sw-10',
    headline: 'מגפה חדשה מאלצת סגרים באירופה',
    emoji: '😷',
    imageCategory: 'crisis',
    correctIsLong: false,
    explanation: 'סגרים = פגיעה בצרכנות ותעופה → ירידות בשוק.',
  },
  {
    id: 'sw-11',
    headline: 'ממשלה מכריזה על תוכנית תשתיות לאומית בטריליונים',
    emoji: '🏗️',
    imageCategory: 'trade',
    correctIsLong: true,
    explanation: 'השקעות תשתית = צמיחה כלכלית + מקומות עבודה → עלייה.',
  },
  {
    id: 'sw-12',
    headline: 'בנק גדול הכריז על חדלות פירעון',
    emoji: '💥',
    imageCategory: 'scandal',
    correctIsLong: false,
    explanation: 'קריסת בנק = פאניקה בשוק הפיננסי → ירידות.',
  },
  {
    id: 'sw-13',
    headline: 'מחירי הנפט ירדו ב-30% ביום אחד',
    emoji: '⛽',
    imageCategory: 'trade',
    correctIsLong: false,
    explanation: 'קריסת נפט = סימן להאטה בביקוש או מלחמת מחירים. בכל מקרה — אי-ודאות גבוהה, השווקים יורדים.',
  },
  {
    id: 'sw-14',
    headline: 'רפורמת מס היסטורית מורידה מס חברות ל-15%',
    emoji: '📋',
    imageCategory: 'bank',
    correctIsLong: true,
    explanation: 'פחות מס = יותר רווח נקי לחברות = עלייה במניות.',
  },
  {
    id: 'sw-15',
    headline: 'חברה מובילה ביקשה פירוק מרצון מבית המשפט',
    emoji: '⚖️',
    imageCategory: 'scandal',
    correctIsLong: false,
    explanation: 'פירוק = סוף הדרך. המניה מתאפסת.',
  },
  {
    id: 'sw-16',
    headline: 'בנק ישראל העלה את הריבית ב-0.5% בהפתעה',
    emoji: '📈',
    imageCategory: 'bank',
    correctIsLong: false,
    explanation: 'העלאת ריבית = כסף יקר יותר = פחות השקעות והלוואות → ירידות בשוק.',
  },
  {
    id: 'sw-17',
    headline: 'חברת סייבר ישראלית נרכשה ב-5 מיליארד דולר',
    emoji: '🔐',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'רכישה בפרמיה = אות חיובי לכל סקטור הסייבר הישראלי → עלייה.',
  },
  {
    id: 'sw-18',
    headline: 'דוח תעסוקה חלש: אבטלה עלתה ל-6%',
    emoji: '📊',
    imageCategory: 'crisis',
    correctIsLong: false,
    explanation: 'אבטלה גבוהה = צריכה נמוכה = רווחי חברות יורדים → ירידות.',
  },
  {
    id: 'sw-19',
    headline: 'הסכם שלום היסטורי בין שתי מדינות במזרח התיכון',
    emoji: '🕊️',
    imageCategory: 'trade',
    correctIsLong: true,
    explanation: 'יציבות גיאופוליטית = פתיחת שווקים חדשים → אופטימיות ועליות.',
  },
  {
    id: 'sw-20',
    headline: 'SEC פתחה בחקירה נגד בורסת קריפטו גדולה',
    emoji: '⚖️',
    imageCategory: 'scandal',
    correctIsLong: false,
    explanation: 'חקירה רגולטורית = אי-ודאות + פחד ממשקיעים → ירידות.',
  },
  {
    id: 'sw-21',
    headline: 'פייזר הודיעה על חיסון חדשני למחלה נפוצה',
    emoji: '💉',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'פריצת דרך רפואית = פוטנציאל הכנסות ענק + אופטימיות בשוק → עלייה.',
  },
  {
    id: 'sw-22',
    headline: 'סין הכריזה על הגבלות יצוא על מתכות נדירות',
    emoji: '🇨🇳',
    imageCategory: 'trade',
    correctIsLong: false,
    explanation: 'הגבלת יצוא = מחסור בחומרי גלם לטכנולוגיה → פגיעה בייצור העולמי.',
  },
  {
    id: 'sw-23',
    headline: 'אפל דיווחה על ירידה של 20% במכירות האייפון',
    emoji: '📱',
    imageCategory: 'tech',
    correctIsLong: false,
    explanation: 'ירידה במכירות של מוצר הדגל = פגיעה ברווחים → ירידת מניה.',
  },
  {
    id: 'sw-24',
    headline: 'ממשלת הודו הודיעה על פתיחת השוק למשקיעים זרים',
    emoji: '🇮🇳',
    imageCategory: 'trade',
    correctIsLong: true,
    explanation: 'פתיחת שוק ענק = הזדמנות צמיחה למשקיעים → עלייה בשוק ההודי.',
  },
  {
    id: 'sw-25',
    headline: 'חברת תשלומים חשפה פרצת אבטחה שהדליפה מיליוני כרטיסים',
    emoji: '🔓',
    imageCategory: 'scandal',
    correctIsLong: false,
    explanation: 'דליפת מידע = אובדן אמון + קנסות רגולטוריים → ירידה חדה.',
  },
  {
    id: 'sw-26',
    headline: 'הפד הודיע: "לא נעלה ריבית עד סוף השנה"',
    emoji: '🏛️',
    imageCategory: 'bank',
    correctIsLong: true,
    explanation: 'ריבית יציבה/נמוכה = ביטחון לשוק ותנאים נוחים להשקעה → עלייה.',
  },
  {
    id: 'sw-27',
    headline: 'שריפות יער הרסו יבולים ב-3 מדינות אמריקאיות',
    emoji: '🔥',
    imageCategory: 'crisis',
    correctIsLong: false,
    explanation: 'הרס יבולים = מחסור במזון = אינפלציה + פגיעה בכלכלה חקלאית → ירידות.',
  },
  {
    id: 'sw-28',
    headline: 'טסלה השיקה רובוט שעובד במפעלים ומחליף עובדים',
    emoji: '🤖',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'אוטומציה = חיסכון בעלויות ייצור + חדשנות → עלייה למניות טכנולוגיה.',
  },
  {
    id: 'sw-29',
    headline: 'ברזיל הלאימה חברות כרייה פרטיות',
    emoji: '⛏️',
    imageCategory: 'crisis',
    correctIsLong: false,
    explanation: 'הלאמה = חילוט נכסים של משקיעים → פחד מהשקעה באזור → ירידות.',
  },
  {
    id: 'sw-30',
    headline: 'NVIDIA דיווחה על הכנסות שיא מתחום ה-AI',
    emoji: '💎',
    imageCategory: 'tech',
    correctIsLong: true,
    explanation: 'הכנסות שיא = ביקוש אדיר לשבבי AI → עלייה חזקה במניה ובסקטור.',
  },
  // ── Graham "קונה או מוותר?" cards ──
  {
    id: 'sw-g1',
    headline: 'P/E 7 | חוב/הון 0.3 | דיבידנד 10 שנים רצופות | נסחרת ב-60% מערך הנכסים',
    emoji: '📊',
    imageCategory: 'graham',
    correctIsLong: true,
    explanation: 'גראהם היה קונה בשתי ידיים! P/E נמוך, חוב מינימלי, דיבידנד יציב, ומחיר מתחת לערך הנכסים = מרווח ביטחון מושלם.',
  },
  {
    id: 'sw-g2',
    headline: 'P/E 150 | הפסדית | "המניה של העתיד" | עלייה 400% בשנה',
    emoji: '🎰',
    imageCategory: 'graham',
    correctIsLong: false,
    explanation: 'גראהם היה בורח! P/E 150 על חברה הפסדית = ספקולציה טהורה. "פעולת השקעה מחייבת ניתוח יסודי — כל השאר זו ספקולציה".',
  },
  {
    id: 'sw-g3',
    headline: 'P/E 12 | יחס שוטף 2.5 | דיבידנד 3.5% | צמיחת רווחים יציבה 10 שנים',
    emoji: '🏦',
    imageCategory: 'graham',
    correctIsLong: true,
    explanation: 'קלאסיקה של גראהם! P/E סביר, נזילות גבוהה (שוטף 2.5), דיבידנד, ויציבות לאורך עשור. עומד בכל 7 הקריטריונים.',
  },
  {
    id: 'sw-g4',
    headline: 'P/E 45 | צמיחה מהירה | שריפת מזומנים | IPO לפני שנה',
    emoji: '🔥',
    imageCategory: 'graham',
    correctIsLong: false,
    explanation: 'גראהם דורש לפחות 10 שנות רווחיות. חברה שזה שנה בבורסה, שורפת מזומן ב-P/E 45? ספקולציה מסוכנת.',
  },
  {
    id: 'sw-g5',
    headline: 'P/E 9 | ירידה זמנית ברווחים בגלל השקעה חד-פעמית | ערך נכסים גבוה מהמחיר',
    emoji: '🔍',
    imageCategory: 'graham',
    correctIsLong: true,
    explanation: 'גראהם אוהב: ערך נכסים מעל המחיר + P/E נמוך. ירידה זמנית = הזדמנות. "חפשו דולרים ב-50 סנט".',
  },
  {
    id: 'sw-g6',
    headline: 'P/E 80 | "כולם קונים!" | טרנד ברשתות חברתיות | אין יתרון תחרותי ברור',
    emoji: '📱',
    imageCategory: 'graham',
    correctIsLong: false,
    explanation: 'גראהם: "המשקיע שנכנע להתלהבות יתר ישלם ביוקר". P/E 80 בלי יתרון תחרותי = בועה מתקתקת.',
  },
  {
    id: 'sw-g7',
    headline: 'P/E 11 | שירותים ציבוריים | מונופול מקומי | הכנסות צפויות | דיבידנד 5%',
    emoji: '⚡',
    imageCategory: 'graham',
    correctIsLong: true,
    explanation: 'חברת שירותים ציבוריים = הכנסות צפויות + מונופול + דיבידנד שמן. גראהם: "המשקיע ההגנתי מחפש יציבות — וזה בדיוק זה".',
  },
  {
    id: 'sw-g8',
    headline: 'P/E 35 | מותג חזק | צמיחה באסיה | שולי רווח 25% | אבל: מחיר מעל הערך הפנימי',
    emoji: '🌏',
    imageCategory: 'graham',
    correctIsLong: false,
    explanation: 'חברה מצוינת, אבל גראהם אומר: "מרווח ביטחון הוא ההבדל בין משקיע למהמר". כשהמחיר מעל הערך — לחכות.',
  },
  {
    id: 'sw-g9',
    headline: 'נסחרת מתחת למזומן שבקופה | P/E 5 | השוק שונא אותה | רווחים יציבים',
    emoji: '💰',
    imageCategory: 'graham',
    correctIsLong: true,
    explanation: 'A&P של גראהם! חברה שנסחרת מתחת למזומן בקופה = "אתם מקבלים את העסק בחינם". הזדמנות נדירה.',
  },
  {
    id: 'sw-g10',
    headline: 'SPAC | אפס הכנסות | מבוסס על חזון | המחיר רק עולה',
    emoji: '🎪',
    imageCategory: 'graham',
    correctIsLong: false,
    explanation: 'גראהם: "פעולת השקעה מבטיחה ביטחון לכסף שהשקעתם". SPAC בלי הכנסות = ספקולציה. "הספקולנט מנסה להתעשר מהר".',
  },
];

/** Get today's 5 swipe cards (rotates daily) */
export function getTodaySwipeCards(): SwipeCard[] {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const start = (dayIndex * 5) % SWIPE_CARDS.length;
  const result: SwipeCard[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(SWIPE_CARDS[(start + i) % SWIPE_CARDS.length]);
  }
  return result;
}
