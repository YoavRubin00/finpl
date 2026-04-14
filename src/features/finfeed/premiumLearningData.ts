import type { FeedPremiumLearning } from './types';

/* ── Static require() maps — Metro needs literal paths ── */

const MOD_1_1_SUMMARY = { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-summary.png' };

const MOD_1_1_CARDS = [
  MOD_1_1_SUMMARY,
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-1.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-2.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-3.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-4.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-5.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/fc-1-1-6.png' },
];

const MOD_1_3_CARDS = [
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-1.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-2.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-3.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-4.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-5.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-3/fc-1-3-6.png' },
];

const MOD_1_4_CARDS = [
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-1.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-2.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-3.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-4.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-5.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-4/fc-1-4-6.png' },
];

const MOD_1_5_CARDS = [
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-1.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-2.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-3.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-4.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-5.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-5/fc-1-5-6.png' },
];

const MOD_1_6_CARDS = [
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-6/fc-1-6-1.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-6/fc-1-6-2.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-6/fc-1-6-4.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-6/fc-1-6-6.png' },
];

/* ── Graham "Intelligent Investor" — Portrait infographics (dive mode: single image + zoom) ── */
const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics';

const V = 'v3'; // cache-bust: increment to force reload after image replacement
const GRAHAM_MR_MARKET_CARDS = [{ uri: `${BLOB}/graham-mr-market/gm-1.png?${V}` }];
const GRAHAM_MARGIN_SAFETY_CARDS = [{ uri: `${BLOB}/graham-margin-safety/gs-1.png?${V}` }];
const GRAHAM_INVESTOR_TYPES_CARDS = [{ uri: `${BLOB}/graham-investor-types/gt-1.png?${V}` }];
const GRAHAM_PRICE_VS_VALUE_CARDS = [{ uri: `${BLOB}/graham-price-value/gv-1.png?${V}` }];
const GRAHAM_7_RULES_CARDS = [{ uri: `${BLOB}/graham-7-rules/gr-1.png?${V}` }];
const GRAHAM_AP_STORY_CARDS = [{ uri: `${BLOB}/graham-ap-story/ga-1.png?${V}` }];

/* ── Chapter 0: המבוא — portrait infographics per module ── */
const MOD_0_1_CARDS = [
  { uri: `${BLOB}/mod-0-1/fc-0-1-1.png` },
  { uri: `${BLOB}/mod-0-1/fc-0-1-2.png` },
  { uri: `${BLOB}/mod-0-1/fc-0-1-3.png` },
  { uri: `${BLOB}/mod-0-1/fc-0-1-4.png` },
  { uri: `${BLOB}/mod-0-1/fc-0-1-5.png` },
];
const MOD_0_2_CARDS = [
  { uri: `${BLOB}/mod-0-2/fc-0-2-1.png` },
  { uri: `${BLOB}/mod-0-2/fc-0-2-2.png` },
  { uri: `${BLOB}/mod-0-2/fc-0-2-3.png` },
  { uri: `${BLOB}/mod-0-2/fc-0-2-4.png` },
  { uri: `${BLOB}/mod-0-2/fc-0-2-5.png` },
];
const MOD_0_3_CARDS = [
  { uri: `${BLOB}/mod-0-3/fc-0-3-1.png` },
  { uri: `${BLOB}/mod-0-3/fc-0-3-2.png` },
  { uri: `${BLOB}/mod-0-3/fc-0-3-3.png` },
  { uri: `${BLOB}/mod-0-3/fc-0-3-4.png` },
  { uri: `${BLOB}/mod-0-3/fc-0-3-5.png` },
];
const MOD_0_4_CARDS = [
  { uri: `${BLOB}/mod-0-4/fc-0-4-1.png` },
  { uri: `${BLOB}/mod-0-4/fc-0-4-2.png` },
  { uri: `${BLOB}/mod-0-4/fc-0-4-3.png` },
  { uri: `${BLOB}/mod-0-4/fc-0-4-4.png` },
];
const MOD_0_5_CARDS = [
  { uri: `${BLOB}/mod-0-5/fc-0-5-1.png` },
  { uri: `${BLOB}/mod-0-5/fc-0-5-2.png` },
  { uri: `${BLOB}/mod-0-5/fc-0-5-3.png` },
  { uri: `${BLOB}/mod-0-5/fc-0-5-4.png` },
];

/** Premium learning carousel items for the feed */
export const PREMIUM_LEARNING_ITEMS: FeedPremiumLearning[] = [
  {
    id: 'premium-mod-1-4',
    type: 'premium-learning',
    moduleId: 'mod-1-4',
    moduleIndex: 3,
    chapterId: 'chapter-1',
    storeChapterId: 'ch-1',
    moduleTitle: 'תזרים ותקציב',
    diveMode: true,
    zoomRegions: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
    finnExplanations: [
      'מוכנים לנהל את הכסף כמו מקצוענים? תזרים חיובי זה הצעד הראשון.',
      'תקציב זה לא מילה מגונה. זה לתת לכל שקל תפקיד במקום לתהות לאן הוא ברח.',
      'חלקו את ההוצאות — לפחות 20% מההכנסות צריכות ללכת לחיסכון והשקעה.',
      'היזהרו מהוצאות "פאנטום" קטנות שיוצאות כל יום. הן סוגרות את המינוס מהעבר הלא נכון.',
      'כלל הברזל: תמדדו את עצמכם מדי חודש ותראו שהחסכונות באמת גדלים.',
      'תקציב נוקשה מדי יישבר. השאירו קצת אוויר גם לכיף ולהנאות הקטנות.'
    ],
    infographics: MOD_1_4_CARDS,
  },
  {
    id: 'premium-mod-1-3',
    type: 'premium-learning',
    moduleId: 'mod-1-3',
    moduleIndex: 2,
    chapterId: 'chapter-1',
    storeChapterId: 'ch-1',
    moduleTitle: 'אשראי',
    diveMode: true,
    zoomRegions: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
    finnExplanations: [
      'כרטיס אשראי הוא כלי מצוין, תלוי מי מחזיק בו.',
      'ריצה על אשראי רולינג (מתגלגל) זו המלכודת היקרה ביותר במשק. הריבית מפלצתית.',
      'תשלומים נראים זולים בחודש הקרוב, אבל נועלים אתכם לעתיד של חובות מתמשכים.',
      'מסגרת אשראי גדולה בבנק היא פיתוי. השתמשו בה רק למקרי חירום אמיתיים.',
      'דירוג אשראי: זהו תעודת הזהות הפיננסית שלכם. היסטוריית תשלומים חלקה תחסוך לכם אלפים.',
      'זכרו: כסף מפלסטיק עדיין מרגיש למר שוק כמו כסף אמיתי שתצטרכו להחזיר.'
    ],
    infographics: MOD_1_3_CARDS,
  },
  {
    id: 'premium-mod-1-1',
    type: 'premium-learning',
    moduleId: 'mod-1-1',
    moduleIndex: 0,
    chapterId: 'chapter-1',
    storeChapterId: 'ch-1',
    moduleTitle: 'ריבית דריבית',
    diveMode: true,
    zoomRegions: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
    finnExplanations: [
      'הגיע הזמן להכיר את הפלא השמיני של העולם — ריבית דריבית.',
      'איך זה עובד? גם הכסף שלכם מרוויח, וגם הרווח עצמו ממשיך לייצר עוד כסף. מעגל קסמים מנצח.',
      'אלברט איינשטיין כבר אמר: מי שמבין אותה מרוויח, מי שלא – משלם אותה.',
      'זמן הוא הנכס הכי יקר שלכם. להתחיל בגיל 20 אומר עשרות שנות צבירה לעומת גיל 40.',
      'ההבדל בין 4% ל-8% תשואה לאורך 30 שנה הוא לא פי שתיים כסף בכיס. זה אדיר בהרבה!',
      'אפילו עמלות אפסיות מצטברות לאלפים לאורך זמן. היו מודעים למה שאתם משלמים.',
      'הכניסו את הריבית הדריבית לעבוד בשבילכם כבר היום.'
    ],
    infographics: [{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/mod-1-1/ribit.jpg' }],
  },
  {
    id: 'premium-mod-1-5',
    type: 'premium-learning',
    moduleId: 'mod-1-5',
    moduleIndex: 4,
    chapterId: 'chapter-1',
    storeChapterId: 'ch-1',
    moduleTitle: 'לקרוא תלוש שכר',
    diveMode: true,
    zoomRegions: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
    finnExplanations: [
      'תלוש השכר שלכם הוא לא סתם דף נייר מרגיז. פה מתחבאות הזכויות שלכם.',
      'הברוטו הוא מה שחשבתם שאתם מרוויחים. הנטו הוא מה שהמדינה משאירה לכם לקנות איתו ארטיק.',
      'ביטוח לאומי ומס בריאות הם ניכויי חובה, אבל הם גם רשת הביטחון מינימלית שמגיעה לכם.',
      'קרן פנסיה — שימו עין. החלק שמופרש עכשיו הוא זה שיחזיק אתכם בעתיד. אל תזלזלו.',
      'ימי חופשה וימי מחלה: נכסים שלא מקבלים מספיק יחס. החוק מחייב לצבור אותם לטובתכם.',
      'נקודות זיכוי מקטינות אוטומטית את מס ההכנסה. אם לא תוודאו שהן מדויקות — אתם פשוט זורקים כסף.'
    ],
    infographics: MOD_1_5_CARDS,
  },
  {
    id: 'premium-mod-1-6',
    type: 'premium-learning',
    moduleId: 'mod-1-6',
    moduleIndex: 5,
    chapterId: 'chapter-1',
    storeChapterId: 'ch-1',
    moduleTitle: 'הלוואות צרכניות',
    diveMode: true,
    zoomRegions: [[0, 0, 0.85], [0, 0, 0.85], [0, 0, 0.85], [0, 0, 0.85]],
    finnExplanations: [
      'הלוואה צרכנית לא לחתונה או לדירה אלא לפון חדש? זה כמו לאכול ארוחת גורמה מתוך עגלת זבל.',
      'שימו לב לריבית! הבנקים משווקים קלות, אבל כל החזר כזה משאיר אתכם אחורה במשחק הפיננסי.',
      'לפעמים לקנות במזומן ולחסוך מראש יחסוך מאות או אלפי שקלים שהיו זורמים למלווים.',
      'אם לקחתם הלוואה מחוסר ברירה, עשו זאת בתבונה. בדקו את לוח ההחזרים ואל תסכימו לתנאים עיוורים.'
    ],
    infographics: MOD_1_6_CARDS,
  },
  // ── Graham "Intelligent Investor" carousels (Chapter 4) — Portrait + Dive Mode ──
  // Each zoomRegion is [translateX, translateY, scale] matched to the actual image layout
  {
    id: 'premium-graham-mr-market',
    type: 'premium-learning',
    moduleId: 'mod-4-19',
    moduleIndex: 0,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: 'הכירו את מר שוק',
    diveMode: true,
    zoomRegions: [
      [0, -15, 0.82],         // Default: slightly more zoomed out to prevent bottom cutoff
      [-160, -140, 2.4],      // בראשון - "יותר למטה" (moved Y from -70 to -140 to look down)
      [140, -160, 2.4],       // בשני - "תלך יותר שמאלה טיפה" (X from 120 directly towards left to 140, Y to -160)
      [0, -15, 0.82],         // "משם תלך כבר זום אאוט"
      [0, -15, 0.82],         // גם פה זום אאוט
    ],
    infographics: GRAHAM_MR_MARKET_CARDS,
    finnExplanations: [
      'הכירו את מר שוק — השותף הרגשני שמציע לכם מחיר חדש כל יום.',
      'יש לכם חופש בחירה מלא — אפשר להתעלם מהצעות של מר שוק ולחזור מחר.',
      'מר שוק קופץ בין אופוריה לייאוש — בלי שום קשר לערך האמיתי של העסק.',
      'המשקיע החכם קונה כשמר שוק פסימי, ומוכר כשהוא אופטימי מדי.',
      'זכרו: מר שוק הוא השרת שלכם, לא הבוס!',
    ],
  },
  {
    id: 'premium-graham-margin-safety',
    type: 'premium-learning',
    moduleId: 'mod-4-24',
    moduleIndex: 10,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: 'מרווח ביטחון',
    diveMode: true,
    // Image layout: title top → left "הגנה מפני טעויות" + right "המחיר הוא מה שאתה משלם" → center bridge+clock → bottom left "חוק הגשר" + bottom right "קנו דולר ב-50 סנט"
    zoomRegions: [
      [0, 0, 0.85],          // Full view — slightly more zoomed out
      [0, 0, 0.85],          // 'המרווח מגן...' - זום אאוט מלא
      [140, 140, 2.2],       // 'המחיר הוא...' - שמאלה ולמעלה
      [50, -100, 2.2],       // 'כמו גשר שבנוי...'
      [-180, -250, 2.4],     // 'חפשו חברות...' - הכי למטה
      [0, 0, 0.85],          // Back to full
    ],
    infographics: GRAHAM_MARGIN_SAFETY_CARDS,
    finnExplanations: [
      'מרווח ביטחון — העיקרון הכי חשוב של גראהם. בואו נצלול!',
      'המרווח מגן עליכם מטעויות שוק ותנודות — גם אם הניתוח שלכם לא מושלם.',
      'המחיר הוא מה שמשלמים, הערך הוא מה שמקבלים. תמיד חפשו פער.',
      'כמו גשר שבנוי ל-30 טון למשאית של 10 — ככה בונים תיק חזק.',
      'חפשו חברות שנסחרות הרבה מתחת לערך — כמו לקנות דולר ב-50 סנט.',
      'סיכום: ככל שהמרווח גדול יותר — ישנים טוב יותר בלילה.',
    ],
  },
  {
    id: 'premium-graham-investor-types',
    type: 'premium-learning',
    moduleId: 'mod-4-19',
    moduleIndex: 0,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: 'הגנתי vs. יוזם',
    diveMode: false,
    tapZones: true,
    infographics: GRAHAM_INVESTOR_TYPES_CARDS,
    tapZoneLeft: {
      title: 'המשקיע ההגנתי',
      text: 'מתמקד בצמצום זמן, מאמץ ודאגה. בוחר קרנות מחקות או תיק מפוזר לטווח ארוך. מתאים למי שלא רוצה לעסוק בהשקעות יום-יום.',
    },
    tapZoneRight: {
      title: 'המשקיע היוזם',
      text: 'מקדיש זמן ומיומנות לניתוח מעמיק. מחפש עסקאות יוצאות דופן ומוכן להשקיע שעות בלימוד חברות. מתאים למי שנהנה מהתחום.',
    },
    finnExplanations: [
      'שני סוגי משקיעים — לחצו על צד ימין או שמאל של התמונה לפרטים!',
    ],
  },
  {
    id: 'premium-graham-price-value',
    type: 'premium-learning',
    moduleId: 'mod-4-25',
    moduleIndex: 9,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: 'מחיר מול ערך',
    diveMode: true,
    zoomRegions: [
      [0, -15, 0.82],       // Full view
      [0, -15, 0.82],       // Top-left — "מחיר הוא תשלום"
      [0, 30, 2.3],         // Center — chart
      [0, -15, 0.82],       // Bottom-right — "שוק שותף אמוציונלי"
      [0, -15, 0.82],       // Bottom — "מרווח ביטחון"
      [0, -15, 0.82],       // Back to full
    ],
    infographics: GRAHAM_PRICE_VS_VALUE_CARDS,
    finnExplanations: [
      'מחיר מול ערך — ההבדל שהופך אתכם ממהמרים למשקיעים.',
      'מחיר נקבע ע"י פחד ואופוריה. ערך נקבע ע"י ניתוח עסקי אמיתי.',
      'רואים את שני הקווים? כשהמחיר מתחת לערך — שם ההזדמנות!',
      'מר שוק מציע מחירים משתנים כל יום. תפקידכם לנצל את מצבי הרוח שלו.',
      'קנייה במחיר נמוך מהערך = רשת הגנה. ככה נמנעים מהפסדים.',
      'כלל אחד: קנו כשהמחיר מתחת לערך. זה כל הסוד.',
    ],
  },
  {
    id: 'premium-graham-7-rules',
    type: 'premium-learning',
    moduleId: 'mod-4-30',
    moduleIndex: 11,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: '7 כללי המשקיע הנבון',
    diveMode: false,
    singlePageView: true,
    infographics: GRAHAM_7_RULES_CARDS,
    finnExplanations: [
      'כל 7 הכללים יחד? מצאתם את המפתח להשקעה',
    ],
  },
  {
    id: 'premium-graham-ap-story',
    type: 'premium-learning',
    moduleId: 'mod-4-27',
    moduleIndex: 10,
    chapterId: 'chapter-4',
    storeChapterId: 'ch-4',
    moduleTitle: 'כשהפחד יוצר הזדמנות',
    diveMode: true,
    // "בחלק הראשון של הקרוסלה תעביר את הזום להיות הכי שמאלה... בשני- שיהיה יותר למטה והכי שמאלה... בשלישי- הכי למטה ושמאלה... ברביעי שיהיה בזום אאוט... וגם בחמישי"
    zoomRegions: [
      [0, 0, 1],            // Full view
      [180, 170, 2.5],      // בחלק הראשון - הכי שמאלה (180)
      [150, -80, 2.3],      // בשני - "תגי מחיר נופלים" 
      [150, -80, 2.3],      // בשלישי - כמו זה שלפני 
      [0, 0, 1],            // ברביעי זום אאוט
      [0, 0, 1],            // וגם בחמישי זום אאוט
    ],
    infographics: GRAHAM_AP_STORY_CARDS,
    finnExplanations: [
      'כשהפחד יוצר הזדמנות — סיפור אמיתי מהשוק. בואו נצלול!',
      'מר שוק הוא שותף רגשי — הוא מציע מחירים מבוססי פאניקה. לא צריך להקשיב.',
      'תגי המחיר נופלים... אבל שימו לב — הם הופכים למטבעות זהב בדרך!',
      'מחיר המניה זה רק הצבעה רגעית. הערך האמיתי נקבע לפי ביצועי העסק לאורך זמן.',
      'מי שרוכש בהנחה משמעותית ושומר על מרווח ביטחון — מגן על הקרן מפני טעויות.',
      'הלקח: הפחד של אחרים הוא ההזדמנות שלכם. תבדקו מספרים, לא כותרות.',
    ],
  },
  // ── Chapter 0: המבוא — infographic carousels ──
  {
    id: 'premium-mod-0-1',
    type: 'premium-learning',
    moduleId: 'mod-0-1',
    moduleIndex: 0,
    chapterId: 'chapter-0',
    storeChapterId: 'ch-0',
    moduleTitle: 'מה זה בכלל כסף?',
    infographics: MOD_0_1_CARDS,
    finnExplanations: [
      'פעם שילמו בפרות ותפוחי אדמה. אבל מה קורה אם אף אחד לא רוצה מה שיש לך?',
      'כסף הומצא בדיוק בשביל זה — אמצעי חליפין שכולם מסכימים על ערכו.',
      'בניגוד לעגבניות שירקבו, כסף שומר את הערך שייצרת — לפחות בתיאוריה.',
      'כסף הוא גם סרגל: בזכותו אנחנו יודעים כמה שעות עבודה שוות לאייפון.',
      'היום הכסף שלנו מבוסס על אמון בלבד. אין זהב מאחוריו — רק הבטחה.',
    ],
  },
  {
    id: 'premium-mod-0-2',
    type: 'premium-learning',
    moduleId: 'mod-0-2',
    moduleIndex: 1,
    chapterId: 'chapter-0',
    storeChapterId: 'ch-0',
    moduleTitle: 'מושגי יסוד פיננסיים',
    infographics: MOD_0_2_CARDS,
    finnExplanations: [
      'בנק זה חנות שמוכרת כסף. הוא לוקח ממך בזול ומוכר ליד שנייה ביוקר.',
      'חשבון עו"ש — הבסיס שלך. משם נכנס ומשם יוצא כל הכסף.',
      'ריבית — חרב פיפיות: אם אתה חוסך היא עובדת בשבילך, אם אתה לווה — נגדך.',
      'אשראי נראה חינם, אבל מחכה לך בפינה עם חשבון.',
      'פנסיה: טיפות קטנות שהופכות לבריכה אחרי 40 שנה. תתחילו מוקדם.',
    ],
  },
  {
    id: 'premium-mod-0-3',
    type: 'premium-learning',
    moduleId: 'mod-0-3',
    moduleIndex: 2,
    chapterId: 'chapter-0',
    storeChapterId: 'ch-0',
    moduleTitle: 'הגנב השקוף: אינפלציה',
    infographics: MOD_0_3_CARDS,
    finnExplanations: [
      'אינפלציה — הגנב שלא רואים. הוא לא שובר דלתות, הוא שוחק את הכסף שלך בשקט.',
      'כוח קנייה: אותם 100 שקל קונים היום פחות מאשר לפני 10 שנים.',
      'מי שומר מזומן — מפסיד. מי שמחזיק בנכסים — מנצח.',
      'ריבית ריאלית = ריבית מינוס אינפלציה. אם התוצאה שלילית — אתה מפסיד.',
      'ההגנה: להשקיע בנכסים שעולים עם הזמן במקום לשמור מזומן נשחק.',
    ],
  },
  {
    id: 'premium-mod-0-4',
    type: 'premium-learning',
    moduleId: 'mod-0-4',
    moduleIndex: 3,
    chapterId: 'chapter-0',
    storeChapterId: 'ch-0',
    moduleTitle: 'כמה נכנס וכמה יוצא',
    infographics: MOD_0_4_CARDS,
    finnExplanations: [
      'הכנסות מול הוצאות — המשוואה הכי חשובה בחיים הפיננסיים שלך.',
      'תזרים חיובי = חופש. תזרים שלילי = לחץ. תבדקו לאיזה צד אתם.',
      'מאזן חיובי — מדרגות ירוקות למעלה. מאזן שלילי — בור אדום למטה.',
      'FOMO והטלפון שואב מטבעות. שימו לב כמה מנויים והוצאות "קטנות" יש לכם.',
    ],
  },
  {
    id: 'premium-mod-0-5',
    type: 'premium-learning',
    moduleId: 'mod-0-5',
    moduleIndex: 4,
    chapterId: 'chapter-0',
    storeChapterId: 'ch-0',
    moduleTitle: 'אז למה להשקיע?',
    infographics: MOD_0_5_CARDS,
    finnExplanations: [
      'במקום שאתה תעבוד בשביל הכסף — תן לכסף לעבוד בשבילך.',
      'ריבית דריבית: הרווחים מייצרים רווחים. לאורך זמן, הצמיחה מפלצתית.',
      'מניות, אגח, נדלן, קרנות — כל אחד מתאים למצב אחר.',
      'בטווח קצר — רכבת הרים. בטווח ארוך — הפסגה תמיד גבוהה יותר.',
    ],
  },
];
