import type {
  TierConfig,
  StockCategory,
  FantasyLeaderboardEntry,
  WeeklyMission,
  CompetitionPhase,
} from './fantasyTypes';

// ---------------------------------------------------------------------------
// Phase logic
// ---------------------------------------------------------------------------

/**
 * Computes the current competition phase based on the day of week + hour.
 * Week cycle (Israel time, day 0 = Sunday):
 *   Sat 20:00 → Mon 09:00  draft window (edit portfolio for next week)
 *   Mon 09:00 → Fri 23:05  competition (live, portfolio locked)
 *   Fri 23:05 → Sat 20:00  results (claim prizes, leagues settled)
 */
export function getCompetitionPhase(now: Date = new Date()): CompetitionPhase {
  // ⚠️ DEV OVERRIDE — always return 'draft' so the league can be entered any
  // time during testing. Remove this early-return to restore real phase logic.
  if (now) return 'draft';

  const day = now.getDay(); // 0=Sun … 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeDecimal = hour + minute / 60;

  // ── Draft window: Sat 20:00 → Mon 09:00 ──
  const isSatAfter20 = day === 6 && timeDecimal >= 20;
  const isSun = day === 0;
  const isMonBefore9 = day === 1 && timeDecimal < 9;
  const inDraftWindow = isSatAfter20 || isSun || isMonBefore9;

  // ── Competition window: Mon 09:00 → Fri 23:05 ──
  const isMonAfter9 = day === 1 && timeDecimal >= 9;
  const isTue = day === 2;
  const isWed = day === 3;
  const isThu = day === 4;
  const isFriBefore2305 = day === 5 && (hour < 23 || (hour === 23 && minute < 5));
  const inCompetition = isMonAfter9 || isTue || isWed || isThu || isFriBefore2305;

  // ── Results window: Fri 23:05 → Sat 20:00 ──
  const isFriAfter2305 = day === 5 && (hour > 23 || (hour === 23 && minute >= 5));
  const isSatBefore20 = day === 6 && timeDecimal < 20;
  const inResults = isFriAfter2305 || isSatBefore20;

  if (inResults) return 'results';
  if (inDraftWindow) return 'draft';
  if (inCompetition) return 'competition';
  return 'pre_draft';
}

/** ISO weekId: "YYYY-WNN" using Sun-start weeks aligned to competition cycle */
export function getCurrentWeekId(now: Date = new Date()): string {
  const d = new Date(now);
  // Shift to nearest Sunday as week start
  d.setDate(d.getDate() - d.getDay());
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Next draft open time: upcoming Saturday 20:00 (edit window opens). */
export function getNextDraftOpen(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  d.setHours(20, 0, 0, 0);
  return d;
}

/** Competition end: upcoming Friday 23:05 (Israel time — when markets close in NY) */
export function getCompetitionEnd(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilFri = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFri);
  d.setHours(23, 5, 0, 0);
  return d;
}

/** Draft close: upcoming Monday 09:00 (edit window closes, competition starts). */
export function getDraftClose(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilMon = (1 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(9, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Tier configs
// ---------------------------------------------------------------------------

export const TIER_CONFIGS: Record<string, TierConfig> = {
  silver: {
    id: 'silver',
    label: 'ליגת הכסף',
    emoji: '🥈',
    entryCost: 1_000,
    // 1st: 5× coins (5,000), 2nd: 3× (3,000), 3rd: 2× (2,000), 4th: 1.5×, 5th: 1.2×
    prizeMultipliers: [5, 3, 2, 1.5, 1.2],
    prizeXP: [500, 300, 200, 100, 50],
    // Top 3 also win diamonds
    prizeDiamonds: [10, 5, 3, 0, 0],
  },
  gold: {
    id: 'gold',
    label: 'ליגת הזהב',
    emoji: '🥇',
    entryCost: 10_000,
    // 1st: 5× (50,000), 2nd: 3× (30,000), 3rd: 2× (20,000), 4th: 1.5×, 5th: 1.2×
    prizeMultipliers: [5, 3, 2, 1.5, 1.2],
    prizeXP: [2000, 1200, 800, 400, 200],
    prizeDiamonds: [50, 25, 15, 0, 0],
  },
  diamond: {
    id: 'diamond',
    label: 'ליגת היהלומים',
    emoji: '💎',
    entryCost: 100_000,
    // 1st: 5× (500,000), 2nd: 3× (300,000), 3rd: 2× (200,000), 4th: 1.5×, 5th: 1.2×
    prizeMultipliers: [5, 3, 2, 1.5, 1.2],
    prizeXP: [5000, 3000, 2000, 1000, 500],
    prizeDiamonds: [250, 125, 75, 0, 0],
  },
};

// ---------------------------------------------------------------------------
// Stock universe — 5 categories
// tech (6) · spec_growth (6) · energy (6) · israel (10) · crypto (6)
// ---------------------------------------------------------------------------

export const STOCK_CATEGORIES: StockCategory[] = [
  {
    id: 'tech',
    label: 'טכנולוגיה',
    emoji: '🤖',
    description:
      'ענקיות הטק שמעצבות את העולם הדיגיטלי — Apple, Nvidia, Google. ' +
      'יציבות יחסית עם פוטנציאל צמיחה גבוה, חשיפה ישירה למהפכת ה-AI.',
    stocks: [
      {
        ticker: 'AAPL',
        name: 'Apple',
        tagline: 'ממלכת האייפון',
        categoryId: 'tech',
        mockPrice: 213.50,
        mockWeeklyChange: 2.4,
        sharkAnalysis:
          'אפל ממשיכה לשלוט בשוק הסמארטפונים עם שולי רווח עצומים. מחזור ה-Services צומח ב-15% שנה-על-שנה ומציע יציבות אמיתית. אני מאמין שהמניה מוצאת תמיכה חזקה ב-$200 לפני כל תנועה לכיוון $230.',
      },
      {
        ticker: 'NVDA',
        name: 'NVIDIA',
        tagline: 'מלך הבינה המלאכותית',
        categoryId: 'tech',
        mockPrice: 875.20,
        mockWeeklyChange: 5.1,
        sharkAnalysis:
          'NVIDIA היא המנועה האמיתית של מהפכת ה-AI. ביקוש ל-GPU לצ\'אט-בוטים ומרכזי נתונים ממשיך לרסק שיאים. סיכון: תמחור גבוה מאוד — P/E מעל 70. אבל אם ה-AI ממשיך לגדול, NVDA תוביל.',
      },
      {
        ticker: 'GOOGL',
        name: 'Alphabet',
        tagline: 'אדוני החיפוש',
        categoryId: 'tech',
        mockPrice: 178.90,
        mockWeeklyChange: 1.8,
        sharkAnalysis:
          'גוגל מחזיקה ב-92% מחיפוש הגלובלי — הגנה עסקית שקשה לשבור. Google Cloud צומח ב-28% ומאיים על AWS. האתגר הגדול: שילוב Gemini ב-Search בלי לפגוע בהכנסות מפרסום.',
      },
      {
        ticker: 'META',
        name: 'Meta',
        tagline: 'אימפריית הרשתות החברתיות',
        categoryId: 'tech',
        mockPrice: 512.30,
        mockWeeklyChange: 3.2,
        sharkAnalysis:
          'Meta שינתה כיוון דרמטית — מ"Year of Efficiency" להשקעות AI מסיביות. Family of Apps מייצרת $40B+ רווח תפעולי. Quest 3 ו-Ray-Ban Glasses פותחים שוק חדש. זה לא רק פייסבוק.',
      },
      {
        ticker: 'MSFT',
        name: 'Microsoft',
        tagline: 'ענקית התוכנה',
        categoryId: 'tech',
        mockPrice: 415.60,
        mockWeeklyChange: 1.5,
        sharkAnalysis:
          'מיקרוסופט הפכה ל-AI infrastructure company עם Copilot ו-Azure OpenAI. הכנסות Azure צמחו 31% — ומשמשות כבסיס לכל שירותי ה-AI הארגוניים. המניה יציבה יחסית עם דיבידנד.',
      },
      {
        ticker: 'TSLA',
        name: 'Tesla',
        tagline: 'חלוצת הרכב החשמלי',
        categoryId: 'tech',
        mockPrice: 248.80,
        mockWeeklyChange: -1.2,
        sharkAnalysis:
          'טסלה היא גם חברת רכב, גם חברת אנרגיה וגם חברת AI — זה מה שמצדיק את התמחור. Robotaxi ו-Full Self-Driving יכולים לשנות הכל. אבל המחרה על עתיד רחוק יוצר תנודתיות גבוהה.',
      },
    ],
  },
  {
    id: 'spec_growth',
    label: 'צמיחה ספקולטיביות',
    emoji: '🚀',
    description:
      'מניות בשלב מוקדם עם פוטנציאל קפיצה אדיר — וגם סיכון גבוה. ' +
      'חברות שמשנות תעשיות שלמות: אנרגיה גרעינית מודולרית, מחשוב קוונטי, חלל, AI לממשלות. ' +
      'תנודתיות גבוהה, פוטנציאל עצום — בחר רק אם אתה מוכן לתנודות.',
    stocks: [
      {
        ticker: 'OKLO',
        name: 'Oklo Inc',
        tagline: 'כורים גרעיניים זעירים — מהפכת ה-AI Energy',
        categoryId: 'spec_growth',
        mockPrice: 28.40,
        mockWeeklyChange: 8.2,
        sharkAnalysis:
          'אוקלו בונה SMR (כורים גרעיניים זעירים) כדי להזין את מרכזי הנתונים של ה-AI. סם אלטמן מסטארטאפ OpenAI יושב ב-board. אישור NRC קרב — אם יגיע, המניה יכולה לטוס. סיכון: ביצוע ולוחות זמנים.',
      },
      {
        ticker: 'IONQ',
        name: 'IonQ',
        tagline: 'חלוץ המחשוב הקוונטי המסחרי',
        categoryId: 'spec_growth',
        mockPrice: 42.10,
        mockWeeklyChange: 6.5,
        sharkAnalysis:
          'IonQ היא חברת המחשוב הקוונטי הראשונה שנסחרה בבורסה. שותפויות עם AWS, Azure ו-Google Cloud. מחשוב קוונטי עדיין בשלביו המוקדמים, אבל IonQ מובילה בטכנולוגיית trapped-ion. רכבת הרים.',
      },
      {
        ticker: 'RKLB',
        name: 'Rocket Lab',
        tagline: 'החלל לפי דרישה',
        categoryId: 'spec_growth',
        mockPrice: 24.80,
        mockWeeklyChange: 4.1,
        sharkAnalysis:
          'רוקט לאב היא SpaceX הקטנה — שיגורים מסחריים תכופים עם Electron, ובקרוב גם Neutron rocket (כבד יותר). חוזים עם NASA וצבא ארה"ב. עולה במהירות מהוצאה לעבודה לרווחיות.',
      },
      {
        ticker: 'PLTR',
        name: 'Palantir',
        tagline: 'מוח ה-AI של ממשלות וחברות',
        categoryId: 'spec_growth',
        mockPrice: 67.30,
        mockWeeklyChange: 3.8,
        sharkAnalysis:
          'פלאנטיר מספקת תוכנת AI לפנטגון, CIA וגם לחברות ענק. AIP (Artificial Intelligence Platform) צובר תאוצה במגזר העסקי. תמחור מטורף — אבל הצמיחה האמיתית עוד לפנינו.',
      },
      {
        ticker: 'ASTS',
        name: 'AST SpaceMobile',
        tagline: 'אינטרנט סלולרי מהחלל',
        categoryId: 'spec_growth',
        mockPrice: 31.20,
        mockWeeklyChange: 9.1,
        sharkAnalysis:
          'ASTS בונה לוויינים שמדברים ישירות עם הסמארטפון שלך — בלי אנטנה מיוחדת. שותפויות עם AT&T, Verizon ו-Vodafone. אם הטכנולוגיה תעבוד בגדול, זה משנה לתמיד את התקשורת העולמית.',
      },
      {
        ticker: 'SMR',
        name: 'NuScale Power',
        tagline: 'אנרגיה גרעינית מודולרית מאושרת NRC',
        categoryId: 'spec_growth',
        mockPrice: 22.60,
        mockWeeklyChange: 5.7,
        sharkAnalysis:
          'NuScale היא חברת SMR האמריקאית הראשונה שקיבלה אישור עיצוב מ-NRC. הביקוש מצד מרכזי נתונים ל-AI הופך אותה לרלוונטית עכשיו. הסיכון: הפרויקט הראשון בוטל ב-2023 — מחפשים לקוח עוגן.',
      },
    ],
  },
  {
    id: 'energy',
    label: 'ערך',
    emoji: '⚡',
    description:
      'מניות הערך הקלאסיות של וול סטריט — Walmart, Coca-Cola, Berkshire. ' +
      'מותגים גלובליים, דיבידנדים יציבים ותנודתיות נמוכה — הסלע של התיק.',
    stocks: [
      {
        ticker: 'WMT',
        name: 'Walmart',
        tagline: 'מלך הקמעונאות',
        categoryId: 'energy',
        mockPrice: 198.40,
        mockWeeklyChange: 0.8,
        sharkAnalysis:
          'וולמארט היא ענקית הקמעונאות הגדולה בעולם — $650B מכירות שנתיות ומעל 10,500 חנויות. e-commerce צומח 25% שנתי וWalmart+ מתחרה ב-Amazon Prime. דיבידנד עולה 50 שנה ברצף.',
      },
      {
        ticker: 'KO',
        name: 'Coca-Cola',
        tagline: 'המותג מספר 1 בעולם',
        categoryId: 'energy',
        mockPrice: 67.30,
        mockWeeklyChange: 0.5,
        sharkAnalysis:
          'קוקה קולה — המותג המוכר בעולם, נמכר ב-200+ מדינות. Buffett מחזיק 9% מהמניה כי המודל פשוט: סירופ ב-cents, מותג של מיליארדים. דיבידנד עולה 62 שנה ברציפות — Dividend King.',
      },
      {
        ticker: 'PG',
        name: 'Procter & Gamble',
        tagline: 'מותגי הצרכן הקלאסיים',
        categoryId: 'energy',
        mockPrice: 172.10,
        mockWeeklyChange: 0.6,
        sharkAnalysis:
          'P&G הוא בית של Tide, Pampers, Gillette ועוד — 65 מותגים שבכל בית. Pricing power חזק במיוחד באינפלציה. דיבידנד עולה 68 שנה ברצף. defensive play קלאסי לכל סוגי השוק.',
      },
      {
        ticker: 'JNJ',
        name: 'Johnson & Johnson',
        tagline: 'ענקית בריאות-צרכן',
        categoryId: 'energy',
        mockPrice: 158.90,
        mockWeeklyChange: 0.4,
        sharkAnalysis:
          'JNJ היא Healthcare giant עם 130 שנה של רצף. AAA credit rating — אחד מ-2 בלבד באמריקה. דיבידנד עולה 61 שנה ברצף. עבר spin-off של Kenvue, נשאר עם pharma + medical devices — שני הסקטורים הכי חזקים.',
      },
      {
        ticker: 'BRK.B',
        name: 'Berkshire Hathaway',
        tagline: 'האימפריה של באפט',
        categoryId: 'energy',
        mockPrice: 432.50,
        mockWeeklyChange: 1.1,
        sharkAnalysis:
          'ברקשייר היא ה-conglomerate של וורן באפט — מחזיקה Apple, Coca-Cola, GEICO, BNSF Railway ועוד עשרות חברות. $200B+ במזומן מוכן להזדמנויות. אין דיבידנד — באפט מעדיף buybacks. רכוש אותה כדי לישון בשקט.',
      },
      {
        ticker: 'MCD',
        name: "McDonald's",
        tagline: 'הקשתות הזהובות',
        categoryId: 'energy',
        mockPrice: 295.20,
        mockWeeklyChange: 0.7,
        sharkAnalysis:
          'מקדונלדס היא במהותה חברת נדל"ן ש-ranchising מסעדות. 40,000+ סניפים גלובליים, רובם מתופעלים ע"י זכיינים — מודל הון נמוך, תזרים גבוה. דיבידנד עולה 48 שנה ברצף. recession-proof.',
      },
    ],
  },
  {
    id: 'israel',
    label: 'שוק ישראלי',
    emoji: '🇮🇱',
    description:
      '10 המניות הגדולות בת"א-25 — הבורסה של תל אביב. ' +
      'חברות ישראליות שאתה מכיר מהיומיום: בנקים, תרופות, נדל"ן, ביטחון והייטק. ' +
      'סיכון נמוך-בינוני, עיגון מקומי, מחירים בשקלים.',
    stocks: [
      {
        ticker: 'TEVA',
        name: 'טבע',
        tagline: 'ענקית הגנריקה הישראלית',
        categoryId: 'israel',
        mockPrice: 55.80,
        mockWeeklyChange: 1.6,
        currency: '₪',
        sharkAnalysis:
          'טבע השלימה turnaround מרשים תחת המנכ"ל ריצ\'רד פרנסיס. AUSTEDO ו-UZEDY (תרופות חדשות) צומחים מהר. החוב ירד משמעותית. אחרי עשור קשה, המניה בדרך חזרה לאהדה.',
      },
      {
        ticker: 'ICL',
        name: 'כי"ל',
        tagline: 'מלך האשלג והדשנים העולמי',
        categoryId: 'israel',
        mockPrice: 17.20,
        mockWeeklyChange: 0.9,
        currency: '₪',
        sharkAnalysis:
          'כי"ל היא ספקית אשלג מובילה בעולם — מהמרת ים המלח. ביקוש דשנים תלוי במזון ובאוכלוסייה. מלחמת אוקראינה הפכה את כי"ל לקריטית — היא אחת היחידות שיכולות להחליף את רוסיה.',
      },
      {
        ticker: 'NICE',
        name: 'נייס',
        tagline: 'תוכנת השירות שמפעילה את העולם',
        categoryId: 'israel',
        mockPrice: 642.50,
        mockWeeklyChange: 2.3,
        currency: '₪',
        sharkAnalysis:
          'נייס מובילה גלובלית ב-CCaaS (Contact Center as a Service) ו-AI לשירות לקוחות. רוב הכנסותיה במנויים cloud עם גידול חזק. אלקטיב למשקיעים שמחפשים חשיפת SaaS ישראלית עם איכות גלובלית.',
      },
      {
        ticker: 'ESLT',
        name: 'אלביט מערכות',
        tagline: 'החוד של תעשיית הביטחון',
        categoryId: 'israel',
        mockPrice: 970.00,
        mockWeeklyChange: 3.4,
        currency: '₪',
        sharkAnalysis:
          'אלביט נהנית מ-tailwind ביטחוני חסר תקדים — הזמנות שיא בעקבות מלחמות אוקראינה, אירופה והמזה"ת. רשימת הזמנות ל-3+ שנים קדימה. אחת מה-pure plays הטובות ביותר בעולם בענף.',
      },
      {
        ticker: 'POLI',
        name: 'בנק הפועלים',
        tagline: 'הבנק הגדול בישראל',
        categoryId: 'israel',
        mockPrice: 36.40,
        mockWeeklyChange: 1.1,
        currency: '₪',
        sharkAnalysis:
          'הפועלים הוא הבנק הגדול בישראל עם נתח שוק עצום. ריביות גבוהות מגדילות את מרווח הריבית. דיבידנד נדיב ויחס הון חזק. שותפות פיננסית יציבה לכלכלה הישראלית.',
      },
      {
        ticker: 'LUMI',
        name: 'בנק לאומי',
        tagline: 'הבנק הוותיק והיציב',
        categoryId: 'israel',
        mockPrice: 32.10,
        mockWeeklyChange: 1.0,
        currency: '₪',
        sharkAnalysis:
          'לאומי שני בגודלו אך לעיתים ראשון ברווחיות. ROE עקבי גבוה, חשיפה מאוזנת בין משק הבית לעסקים. ההשקעה ב-Pepper הציבה אותו כמוביל דיגיטל. בנק קלאסי עם DNA חדשני.',
      },
      {
        ticker: 'MZTF',
        name: 'מזרחי טפחות',
        tagline: 'מלך המשכנתאות הישראלי',
        categoryId: 'israel',
        mockPrice: 152.30,
        mockWeeklyChange: 1.4,
        currency: '₪',
        sharkAnalysis:
          'מזרחי טפחות שולט בשוק המשכנתאות הישראלי. הריבית הגבוהה הגדילה את הכנסות הריבית באופן עקבי. תיק המשכנתאות איכותי עם NPL נמוך. אחד הבנקים הרווחיים ביותר ב-OECD.',
      },
      {
        ticker: 'AZRG',
        name: 'עזריאלי',
        tagline: 'אימפריית הקניונים והנדל"ן',
        categoryId: 'israel',
        mockPrice: 215.80,
        mockWeeklyChange: 0.8,
        currency: '₪',
        sharkAnalysis:
          'עזריאלי מחזיקה בקניונים, משרדים ומרכזי נתונים בישראל. מרכזי הנתונים הם המנוע הצומח החדש — ביקוש מ-AI מצד היפר-סקיילרים. תיק נדל"ן איכותי שמייצר תזרים יציב.',
      },
      {
        ticker: 'ENLT',
        name: 'אנלייט אנרגיה',
        tagline: 'האנרגיה המתחדשת של ישראל',
        categoryId: 'israel',
        mockPrice: 50.40,
        mockWeeklyChange: 2.7,
        currency: '₪',
        sharkAnalysis:
          'אנלייט בונה ומפעילה חוות סולאר ורוח באירופה, ישראל וארה"ב. צבר פרויקטים עצום של GW-ים. נהנית מסבסוד וביקוש מתמדים לאנרגיה ירוקה. סיכון: הריבית הגבוהה מייקרת מימון.',
      },
      {
        ticker: 'BEZQ',
        name: 'בזק',
        tagline: 'תשתית התקשורת של ישראל',
        categoryId: 'israel',
        mockPrice: 5.65,
        mockWeeklyChange: 0.5,
        currency: '₪',
        sharkAnalysis:
          'בזק היא תשתית הסיב האופטי, הסלולר (פלאפון) והטלוויזיה (yes) של ישראל. רגולציה מקלה אפשרה reorg ארגוני. תזרים מזומנים יציב, דיבידנד אטרקטיבי. הימור defensive על תשתית.',
      },
    ],
  },
  {
    id: 'crypto',
    label: 'קריפטו',
    emoji: '₿',
    description:
      'מטבעות דיגיטליים — ביטקוין, אית\'ריום, סולנה. ' +
      'נכס חדש לחלוטין עם תנודתיות גבוהה — סוף שבוע יכול להזיז 10%+.',
    stocks: [
      {
        ticker: 'BTC',
        name: 'Bitcoin',
        tagline: 'אם המטבעות',
        categoryId: 'crypto',
        mockPrice: 67_400,
        mockWeeklyChange: 3.8,
        sharkAnalysis:
          'ביטקוין הוא "זהב דיגיטלי" — 21 מיליון יחידות בלבד לעולם. ה-Halving האחרון הפחית היצע חדש, ו-ETF-ים מוסדיים מגדילים ביקוש. ההיסטוריה מראה: אחרי Halving, מגיע Bull run. אני כאן.',
      },
      {
        ticker: 'ETH',
        name: 'Ethereum',
        tagline: 'פלטפורמת החוזים החכמים',
        categoryId: 'crypto',
        mockPrice: 3_520,
        mockWeeklyChange: 2.9,
        sharkAnalysis:
          'אית\'ריום היא תשתית האפליקציות הדצנטרליזציות — DeFi, NFT, Layer 2. Staking מוריד supply בשוק. ה-Layer 2 ecosystem (Arbitrum, Optimism) צומח ומחזק ETH כנכס reserve.',
      },
      {
        ticker: 'SOL',
        name: 'Solana',
        tagline: 'המהיר שביניהם',
        categoryId: 'crypto',
        mockPrice: 178.30,
        mockWeeklyChange: 6.1,
        sharkAnalysis:
          'סולנה היא הרשת הכי מהירה (65K tx/sec) והזולה. Meme coins, DePIN וDeFi פועלים כאן בעלות שבריר. Firedancer upgrade יגדיל throughput פי 10. תנודתיות גבוהה — פוטנציאל גבוה.',
      },
      {
        ticker: 'BNB',
        name: 'BNB',
        tagline: 'מטבע הבורסה',
        categoryId: 'crypto',
        mockPrice: 568.20,
        mockWeeklyChange: 1.4,
        sharkAnalysis:
          'BNB הוא המטבע של Binance — הבורסה הגדולה בעולם. Fee discounts, BNB Chain DApps וLaunchpad נותנים ל-BNB ערך utility אמיתי. הסיכון הרגולטורי על Binance ידוע — ומתומחר חלקית.',
      },
      {
        ticker: 'ADA',
        name: 'Cardano',
        tagline: 'הבלוקצ׳יין האקדמי',
        categoryId: 'crypto',
        mockPrice: 0.62,
        mockWeeklyChange: 4.5,
        sharkAnalysis:
          'קרדנו מפותח בגישה "peer-reviewed" — כל קוד עובר מחקר אקדמי. Hydra protocol יאפשר מיליוני tx/sec. עדיין מאחורי Ethereum ו-Solana באימוץ — אבל הבסיס הטכני חזק מאוד.',
      },
      {
        ticker: 'DOGE',
        name: 'Dogecoin',
        tagline: 'ה-Meme שהפך אמיתי',
        categoryId: 'crypto',
        mockPrice: 0.18,
        mockWeeklyChange: 8.3,
        sharkAnalysis:
          'דוג\'קוין התחיל כבדיחה — אבל קהילה של מיליונים ותמיכת Elon Musk הפכו אותו לאמיתי. X (טוויטר) שוקל קבלת DOGE כתשלום. ספקולציה טהורה עם upside מטורף — וגם downside בהתאם.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock leaderboard per tier
// ---------------------------------------------------------------------------

const MOCK_NAMES = [
  'נועה כהן', 'איתי לוי', 'מאיה אברהם', 'עומר דוד', 'שירה מזרחי',
  'יונתן פרץ', 'תמר ביטון', 'אורי גולדשטיין', 'הילה רוזנברג', 'דניאל שמעוני',
  'רועי בן-דוד', 'אופיר יוסף', 'ליאת נחום', 'גל כץ', 'ניב שלום',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function getMockLeaderboard(
  tier: string,
  weekId: string,
): FantasyLeaderboardEntry[] {
  const seed = weekId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) +
    tier.charCodeAt(0);

  return MOCK_NAMES.map((name, i) => {
    const r = seededRandom(seed + i * 17);
    const returnPct = (r * 30 - 10); // -10% to +20%
    const change = i % 3 === 0 ? '+1' : i % 3 === 1 ? '-1' : 'same';
    // No promotion/relegation — every entry is 'stable'.
    return {
      rank: i + 1,
      playerId: `ai-${String(i).padStart(2, '0')}`,
      displayName: name,
      returnPercent: Math.round(returnPct * 10) / 10,
      isLocal: false,
      change: change as FantasyLeaderboardEntry['change'],
      leaguePosition: 'stable' as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Simulated final prices (deterministic per weekId)
// ---------------------------------------------------------------------------

export function simulateWeeklyReturn(ticker: string, weekId: string): number {
  const seed = (weekId + ticker).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const raw = seededRandom(seed) * 30 - 12; // -12% to +18%
  return Math.round(raw * 100) / 100;
}

// ---------------------------------------------------------------------------
// Weekly missions
// ---------------------------------------------------------------------------

export function getWeeklyMissions(weekId: string): WeeklyMission[] {
  const seed = weekId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = seededRandom(seed);
  const missions: WeeklyMission[] = [
    {
      id: 'mission-diverse',
      description: r > 0.5
        ? 'בחר מניה מקטגוריית הערך'
        : 'בחר מניה מהשוק הישראלי',
      bonusXP: 100,
      completed: false,
    },
    {
      id: 'mission-rank',
      description: 'סיים ב-top 10 השבוע',
      bonusXP: 200,
      completed: false,
    },
  ];
  return missions;
}

// ---------------------------------------------------------------------------
// Competition rules
// ---------------------------------------------------------------------------

export const COMPETITION_RULES = [
  'אסור להחליף מניות לאחר נעילת הדראפט ביום ראשון 09:00',
  'הניקוד מבוסס על ממוצע אחוזי השינוי של 5 המניות שבחרת',
  'חמשת הראשונים בכל קטגוריה מקבלים פרסים נוספים',
  'הרווח/הפסד מחושב על דמי הכניסה ששילמת',
  'לא ניתן לשחק בשבועות שחלפו',
  'שינויי מחיר מחושבים ממחיר פתיחה שישי עד סגירת שבת',
];

export const DRAFT_STREAK_BONUSES: Array<{ weeks: number; bonusXP: number; badge?: string }> = [
  { weeks: 2, bonusXP: 50 },
  { weeks: 4, bonusXP: 150 },
  { weeks: 8, bonusXP: 400, badge: 'fantasy-streak-legend' },
];
