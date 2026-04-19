import type { InvestmentScenario } from './daily-challenge-types';

export const INVESTMENT_SCENARIOS: InvestmentScenario[] = [
  {
    id: 'invest-1',
    emoji: '🤖',
    macroHeadline: 'בום הבינה המלאכותית',
    macroDescription:
      'פריצת דרך היסטורית ב-AI מאפשרת אוטומציה עצומה ורווחיות שיא לחברות טכנולוגיה. במקביל הכלכלה הכללית מגמגמת.',
    options: [
      {
        label: 'מדד מניות טכנולוגיה',
        emoji: '💻',
        returnMultiplier: 1.22,
        feedback: 'מצוין! חברות הטכנולוגיה נהנות ישירות מהמהפכה, תשואה גבוהה.',
      },
      {
        label: 'פיקדון שקלי',
        emoji: '🏦',
        returnMultiplier: 1.01,
        feedback: 'בטוח, אבל תשואה זניחה. פספסת הזדמנות גדולה.',
      },
      {
        label: 'אג"ח ממשלתי קצר',
        emoji: '📜',
        returnMultiplier: 1.03,
        feedback: 'סולידי ויציב, אבל רחוק מהתשואה שטכנולוגיה הייתה מביאה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-2',
    emoji: '🔥',
    macroHeadline: 'אינפלציה דוהרת',
    macroDescription:
      'מחירי הסופרמרקט המריאו ב-8%, ונגיד הבנק המרכזי מעלה ריביות באגרסיביות חסרת תקדים.',
    options: [
      {
        label: 'קרן כספית (צמודת ריבית)',
        emoji: '💵',
        returnMultiplier: 1.12,
        feedback: 'מצוין! קרן כספית נהנית מריבית גבוהה, הבחירה החכמה בסביבת ריבית עולה.',
      },
      {
        label: 'שוק המניות הכללי',
        emoji: '📊',
        returnMultiplier: 0.88,
        feedback: 'ריבית גבוהה מכבידה על מניות, ירידה של 12%.',
      },
      {
        label: 'חברות צמיחה ללא רווח',
        emoji: '🚀',
        returnMultiplier: 0.72,
        feedback: 'חברות ללא רווח נפגעות הכי חזק מעליית ריבית, ירידה חדה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-3',
    emoji: '😷',
    macroHeadline: 'סגר מחודש',
    macroDescription:
      'וירוס חדש מאיים לשלוח את כל העולם לסגרים. טיסות מבוטלות וקניונים נסגרים. אנשים עובדים רק מהבית.',
    options: [
      {
        label: 'מניות תיירות ותעופה',
        emoji: '✈️',
        returnMultiplier: 0.6,
        feedback: 'תעופה ותיירות קורסות בסגר, ירידה חדה של 40%.',
      },
      {
        label: 'טכנולוגיה, ענן ומשלוחים',
        emoji: '☁️',
        returnMultiplier: 1.28,
        feedback: 'מצוין! עבודה מהבית = צמיחה מסיבית לחברות ענן ומשלוחים.',
      },
      {
        label: 'אג"ח מסחריות בסיכון',
        emoji: '📉',
        returnMultiplier: 0.85,
        feedback: 'חברות רבות נקלעות לקשיים, אג"ח מסחריות מפסידות.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-4',
    emoji: '⛽',
    macroHeadline: 'זינוק הזהב השחור',
    macroDescription:
      'ספינת הובלה ענקית נתקעה בתעלת סואץ לחצי שנה. מדינות סוגרות יצוא נפט. מחירי השינוע והאנרגיה מרקיעי שחקים.',
    options: [
      {
        label: 'חברות סחורות ואנרגיה',
        emoji: '🛢️',
        returnMultiplier: 1.35,
        feedback: 'מצוין! מחירי אנרגיה מזנקים, חברות סחורות מרוויחות עצום.',
      },
      {
        label: 'חברות תעופה (תלויות דלק)',
        emoji: '✈️',
        returnMultiplier: 0.75,
        feedback: 'חברות תעופה סובלות ממחירי דלק גבוהים, ירידה.',
      },
      {
        label: 'חברות נדל"ן',
        emoji: '🏢',
        returnMultiplier: 0.95,
        feedback: 'נדל"ן לא מושפע ישירות, אבל גם לא מרוויח מהמצב, ניטרלי.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-5',
    emoji: '🏗️',
    macroHeadline: 'תמריצי נדל"ן אגרסיביים',
    macroDescription:
      'שר האוצר הודיע על חלוקת מאות מיליוני ₪ פטורים ממס כדי לעודד קבלנים לבנות שכונות ענק חדשות בפריפריה.',
    options: [
      {
        label: 'מדד חברות בנייה וקבלנות',
        emoji: '🏗️',
        returnMultiplier: 1.25,
        feedback: 'מצוין! תמריצי בנייה = רווחים ישירים לחברות קבלנות.',
      },
      {
        label: 'מטבע מקומי',
        emoji: '💱',
        returnMultiplier: 1.02,
        feedback: 'השפעה מינורית על המטבע, תשואה זניחה.',
      },
      {
        label: 'חברות תשתיות תקשורת',
        emoji: '📡',
        returnMultiplier: 1.05,
        feedback: 'תשתיות צומחות קצת עם בנייה חדשה, אבל לא הנהנות העיקריות.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-6',
    emoji: '🌴',
    macroHeadline: 'החזרה לשגרה התיירותית',
    macroDescription:
      'אחרי שנתיים של משבר עולמי, האוכלוסיה מחוסנת, הגבולות נפתחים ואנשים מתים לצאת לחופשה.',
    options: [
      {
        label: 'קמעונאות אונליין',
        emoji: '🛒',
        returnMultiplier: 0.9,
        feedback: 'אנשים חוזרים לחנויות פיזיות, קמעונאות אונליין נחלשת.',
      },
      {
        label: 'תיירות, מלונאות ותעופה',
        emoji: '🏨',
        returnMultiplier: 1.3,
        feedback: 'מצוין! ריקברי מלא, תיירות ותעופה מזנקות עם פתיחת הגבולות.',
      },
      {
        label: 'זהב',
        emoji: '🥇',
        returnMultiplier: 0.97,
        feedback: 'זהב יציב אבל לא נהנה מאופטימיות, ניטרלי.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-7',
    emoji: '🌱',
    macroHeadline: 'מהפכת האנרגיה הירוקה',
    macroDescription:
      'האיחוד האירופי מעביר חוק שאוסר קניית נפט בתוך עשור, ומעניק מענקי ענק לחברות סולאר ואנרגיית רוח.',
    options: [
      {
        label: 'חברות קידוח מסורתיות',
        emoji: '🛢️',
        returnMultiplier: 0.65,
        feedback: 'חברות נפט מסורתיות קורסות עם האיסור, ירידה חדה.',
      },
      {
        label: 'קרן סל אנרגיה מתחדשת',
        emoji: '☀️',
        returnMultiplier: 1.4,
        feedback: 'מצוין! אנרגיה מתחדשת מקבלת דחיפה אדירה מהחקיקה, תשואה מעולה.',
      },
      {
        label: 'תעשיית פלסטיק כבד',
        emoji: '🏭',
        returnMultiplier: 0.78,
        feedback: 'תעשייה מזהמת נפגעת מרגולציה ירוקה, ירידה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-8',
    emoji: '⚔️',
    macroHeadline: 'מלחמת סחר ומיסים',
    macroDescription:
      'ארה"ב מטילה מכסי יבוא של 50% על כל מוצר מסין כדי לקדם ייצור מקומי. הרבה ענפים נלחצים.',
    options: [
      {
        label: 'ייצור מקומי בארה"ב',
        emoji: '🇺🇸',
        returnMultiplier: 1.2,
        feedback: 'מצוין! ייצור מקומי מקבל דחיפה עצומה מהמכסים, בחירה חכמה.',
      },
      {
        label: 'משלוחים בינלאומיים (תלויות סין)',
        emoji: '🚢',
        returnMultiplier: 0.7,
        feedback: 'חברות שתלויות בסחר עם סין נפגעות ישירות, ירידה.',
      },
      {
        label: 'טכנולוגיה עולמית (חומרים מסין)',
        emoji: '💻',
        returnMultiplier: 0.82,
        feedback: 'חברות טכנולוגיה שתלויות ברכיבים מסין סובלות מעלויות, ירידה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-9',
    emoji: '📉',
    macroHeadline: 'דפלציה, המחירים צונחים',
    macroDescription:
      'הפתעה: מדד המחירים יצא שלילי. צרכנים עוצרים קניות כי מחר "אולי יהיה זול יותר", ורווחי החברות צונחים.',
    options: [
      {
        label: 'אג"ח ממשלתי איכותי',
        emoji: '🏛️',
        returnMultiplier: 1.15,
        feedback: 'מצוין! בדפלציה, אג"ח ממשלתי מרוויח כי הריבית הריאלית עולה.',
      },
      {
        label: 'מניות אופנה וקמעונאות',
        emoji: '👗',
        returnMultiplier: 0.7,
        feedback: 'אנשים לא צורכים, קמעונאות קורסת בדפלציה.',
      },
      {
        label: 'פלטפורמות הלוואות המונים',
        emoji: '💸',
        returnMultiplier: 0.78,
        feedback: 'ביקוש לאשראי יורד בדפלציה, תשואה שלילית.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-10',
    emoji: '🔻',
    macroHeadline: 'הפתעת הריבית האפסית',
    macroDescription:
      'בעקבות חשש מהאטה, הנגיד חותך את הריבית לאפס. הכסף בפיקדון הבנקאי פשוט לא ירוויח כלום מחר בבוקר.',
    options: [
      {
        label: 'מזומן מתחת לבלטה',
        emoji: '💵',
        returnMultiplier: 1.0,
        feedback: 'מזומן לא מרוויח כלום, פספסת את ההזדמנות.',
      },
      {
        label: 'שוק המניות ונדל"ן',
        emoji: '📈',
        returnMultiplier: 1.25,
        feedback: 'מצוין! ריבית אפסית = הכסף "בורח" מהבנק לשוק ההון ונדל"ן. תשואה גבוהה.',
      },
      {
        label: 'קרן כספית שקלית קצרה',
        emoji: '🏦',
        returnMultiplier: 1.005,
        feedback: 'קרן כספית עם ריבית אפסית = תשואה כמעט אפסית.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-11',
    emoji: '🚫',
    macroHeadline: 'סנקציות בינלאומיות על מדינה גדולה',
    macroDescription:
      'ארה"ב ואירופה מטילות סנקציות חמורות על מדינה מרכזית שמייצאת אנרגיה. מחירי הגז באירופה מזנקים ושרשרת האספקה נפגעת.',
    options: [
      {
        label: 'חברות אנרגיה מתחדשת',
        emoji: '⚡',
        returnMultiplier: 1.3,
        feedback: 'מצוין! משבר אנרגיה מאיץ מעבר לאנרגיה ירוקה, ביקוש וזינוק.',
      },
      {
        label: 'חברות ייצור אירופאיות',
        emoji: '🏭',
        returnMultiplier: 0.72,
        feedback: 'ייצור אירופאי תלוי בגז זול, עלויות מזנקות, רווחים צונחים.',
      },
      {
        label: 'אג"ח ממשלתי אמריקאי',
        emoji: '🇺🇸',
        returnMultiplier: 1.04,
        feedback: 'מקלט בטוח, אבל תשואה צנועה. לא ניצלת את ההזדמנות.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-12',
    emoji: '🏚️',
    macroHeadline: 'פיצוץ בועת נדל"ן',
    macroDescription:
      'מחירי הדירות צנחו 25% תוך שנה. קבלנים פושטים רגל, בנקים מהדקים תנאי אשראי, ואנשים מפסיקים לקנות.',
    options: [
      {
        label: 'קרנות ריט (REIT) נדל"ני',
        emoji: '🏢',
        returnMultiplier: 0.6,
        feedback: 'קרנות נדל"ן קורסות עם השוק, ירידה חדה.',
      },
      {
        label: 'מזומן וקרן כספית',
        emoji: '💵',
        returnMultiplier: 1.08,
        feedback: 'מצוין! במשבר נדל"ן, מזומן הוא מלך, שומר ערך ומאפשר לקנות בזול אח"כ.',
      },
      {
        label: 'מניות בנקים',
        emoji: '🏦',
        returnMultiplier: 0.7,
        feedback: 'בנקים חשופים למשכנתאות בעייתיות, ירידה משמעותית.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-13',
    emoji: '⛽',
    macroHeadline: 'גילוי שדה גז ענק בישראל',
    macroDescription:
      'התגלה שדה גז טבעי חדש מול חופי ישראל, שמכפיל את מאגרי האנרגיה של המדינה. ישראל הופכת ליצואנית אנרגיה.',
    options: [
      {
        label: 'חברות אנרגיה ישראליות',
        emoji: '🔥',
        returnMultiplier: 1.35,
        feedback: 'מצוין! חברות הגז הישראליות הן הנהנות הישירות מהגילוי, זינוק.',
      },
      {
        label: 'השקל הישראלי',
        emoji: '₪',
        returnMultiplier: 1.08,
        feedback: 'השקל מתחזק מיצוא גז, אבל התשואה מתונה יחסית.',
      },
      {
        label: 'חברות טכנולוגיה ישראליות',
        emoji: '💻',
        returnMultiplier: 1.05,
        feedback: 'הייטק לא קשור ישירות לגז, השפעה חיובית קלה מתוקף כלכלה חזקה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-14',
    emoji: '📋',
    macroHeadline: 'רפורמה רגולטורית בבנקאות',
    macroDescription:
      'הממשלה מחייבת בנקים לפתוח API לפינטק, מבטלת עמלות, ומאפשרת העברת חשבון בלחיצת כפתור. תחרות חדשה נכנסת לשוק.',
    options: [
      {
        label: 'חברות פינטק וניאו-בנקים',
        emoji: '📱',
        returnMultiplier: 1.28,
        feedback: 'מצוין! פינטק נהנה ישירות מהרגולציה החדשה, כניסה חופשית לשוק.',
      },
      {
        label: 'מניות בנקים מסורתיים',
        emoji: '🏦',
        returnMultiplier: 0.82,
        feedback: 'בנקים מסורתיים מפסידים מונופול ועמלות, ירידה.',
      },
      {
        label: 'אג"ח קונצרני כללי',
        emoji: '📜',
        returnMultiplier: 1.02,
        feedback: 'אג"ח לא מושפע ישירות, תשואה ניטרלית.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-15',
    emoji: '🖥️',
    macroHeadline: 'מתקפת סייבר על תשתיות קריטיות',
    macroDescription:
      'האקרים השביתו את רשת החשמל ומערכת הבנקאות של מדינה גדולה למשך שבוע. פאניקה עולמית מפני מתקפות דומות.',
    options: [
      {
        label: 'חברות אבטחת סייבר',
        emoji: '🛡️',
        returnMultiplier: 1.4,
        feedback: 'מצוין! מתקפה = ביקוש מטורף לאבטחת סייבר, זינוק בהזמנות ובמניות.',
      },
      {
        label: 'מניות טכנולוגיה כלליות',
        emoji: '💻',
        returnMultiplier: 0.88,
        feedback: 'טכנולוגיה נפגעת מחשש שגם היא חשופה, ירידה.',
      },
      {
        label: 'זהב',
        emoji: '🥇',
        returnMultiplier: 1.1,
        feedback: 'זהב עולה כמקלט בטוח, אבל פחות מסייבר שנהנה ישירות.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-16',
    emoji: '🌾',
    macroHeadline: 'בצורת קיצונית בארה"ב',
    macroDescription:
      'גל חום קיצוני הכה בחגורת החקלאות של ארה"ב. יבולי חיטה, תירס וסויה צנחו ב-40%. מחירי המזון מזנקים.',
    options: [
      {
        label: 'סחורות חקלאיות (חיטה, תירס)',
        emoji: '🌾',
        returnMultiplier: 1.35,
        feedback: 'מצוין! מחסור = מחירים גבוהים = רווח למי שמחזיק בסחורות.',
      },
      {
        label: 'רשתות מזון קמעונאיות',
        emoji: '🛒',
        returnMultiplier: 0.85,
        feedback: 'מחירי קלט גבוהים מכבידים על רשתות מזון, רווחים יורדים.',
      },
      {
        label: 'חברות שינוע ימי',
        emoji: '🚢',
        returnMultiplier: 1.05,
        feedback: 'שינוע עולה קצת מיבוא מזון חלופי, אבל לא הנהנה העיקרי.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-17',
    emoji: '🗳️',
    macroHeadline: 'שינוי שלטוני דרמטי',
    macroDescription:
      'בבחירות הפתעה, נבחר נשיא פופוליסטי שמבטיח הלאמת בנקים, מיסים גבוהים על עשירים, ו"חלוקת עושר". השווקים בפאניקה.',
    options: [
      {
        label: 'זהב ומתכות יקרות',
        emoji: '🥇',
        returnMultiplier: 1.2,
        feedback: 'מצוין! אי-ודאות פוליטית = בריחה לנכסים בטוחים כמו זהב.',
      },
      {
        label: 'מניות בנקים מקומיים',
        emoji: '🏦',
        returnMultiplier: 0.55,
        feedback: 'איום הלאמה = קריסת מניות בנקים, ירידה חדה.',
      },
      {
        label: 'מניות חו"ל (S&P 500)',
        emoji: '🌐',
        returnMultiplier: 1.05,
        feedback: 'פיזור גיאוגרפי עוזר, אבל לא מנצל את ההזדמנות בזהב.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-18',
    emoji: '🧓',
    macroHeadline: 'רפורמת פנסיה מקיפה',
    macroDescription:
      'הממשלה מעלה את גיל הפרישה ל-70, מחייבת הפרשה של 20% מהשכר, ומעבירה את כל הכספים לניהול ממשלתי מרוכז.',
    options: [
      {
        label: 'חברות ביטוח ופנסיה פרטיות',
        emoji: '📉',
        returnMultiplier: 0.6,
        feedback: 'הלאמת ניהול פנסיוני = חברות פרטיות מפסידות לקוחות, קריסה.',
      },
      {
        label: 'אג"ח ממשלתי ארוך',
        emoji: '🏛️',
        returnMultiplier: 1.15,
        feedback: 'מצוין! ריכוז כספי פנסיה ממשלתי = ביקוש עצום לאג"ח ממשלתי → עלייה.',
      },
      {
        label: 'מניות צריכה',
        emoji: '🛍️',
        returnMultiplier: 0.9,
        feedback: 'הפרשות גבוהות = פחות כסף פנוי = פגיעה קלה בצריכה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-19',
    emoji: '🚄',
    macroHeadline: 'מהפכת תחבורה אוטונומית',
    macroDescription:
      'רכבים אוטונומיים קיבלו אישור בכל ארה"ב. חברות מוניות וטרנספורט מסורתיות בפאניקה, חברות טכנולוגיה חוגגות.',
    options: [
      {
        label: 'חברות רכב אוטונומי ו-AI',
        emoji: '🤖',
        returnMultiplier: 1.35,
        feedback: 'מצוין! אישור רגולטורי = מסחור מיידי → זינוק במניות טכנולוגיית נהיגה.',
      },
      {
        label: 'חברות מוניות מסורתיות',
        emoji: '🚕',
        returnMultiplier: 0.55,
        feedback: 'מוניות אנושיות הופכות למיותרות, קריסה של המודל העסקי.',
      },
      {
        label: 'חברות ביטוח רכב',
        emoji: '🛡️',
        returnMultiplier: 0.8,
        feedback: 'פחות תאונות = פחות ביטוחים = ירידה בהכנסות חברות ביטוח.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
  {
    id: 'invest-20',
    emoji: '💊',
    macroHeadline: 'פריצת דרך רפואית',
    macroDescription:
      'חברת ביוטק ישראלית פיתחה תרופה שמרפאת סוכרת סוג 2 לחלוטין. מניותיה זינקו 300% ביום. האם להיכנס?',
    options: [
      {
        label: 'לקנות את המניה הספציפית',
        emoji: '💊',
        returnMultiplier: 0.7,
        feedback: 'אחרי זינוק של 300% ביום, סביר שיהיה תיקון חד. קנייה בשיא ההייפ מסוכנת.',
      },
      {
        label: 'קרן סל ביוטק רחבה',
        emoji: '🧬',
        returnMultiplier: 1.2,
        feedback: 'מצוין! הסקטור כולו נהנה מאופטימיות, בלי הסיכון של מניה אחת בשיא.',
      },
      {
        label: 'חברות תרופות מסורתיות (Big Pharma)',
        emoji: '💉',
        returnMultiplier: 0.92,
        feedback: 'ביג פארמה נפגעת מהתחרות החדשה, ירידה קלה.',
      },
    ],
    xpReward: 40,
    coinReward: 20,
    virtualBudget: 10000,
  },
];

/** Get today's investment scenario based on day index (offset from dilemma) */
export function getTodayInvestment(): InvestmentScenario {
  const dayIndex = Math.floor(Date.now() / 86400000 + 5) % INVESTMENT_SCENARIOS.length;
  return INVESTMENT_SCENARIOS[dayIndex];
}
