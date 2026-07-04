import type {
  TierConfig,
  StockCategory,
  StockCategoryId,
  DraftStock,
  FantasyLeaderboardEntry,
  WeeklyMission,
  CompetitionPhase,
} from './fantasyTypes';
import { getIsraelParts, getIsraelDateISO, israelDatePlusDays } from '../../utils/israelTime';

// ---------------------------------------------------------------------------
// Phase logic — Israel-time weekly cycle (parallel drafting)
// ---------------------------------------------------------------------------
//
// Cycle (all times Asia/Jerusalem, day 0 = Sunday):
//   Mon 09:00 → next Mon 09:00   competition — the live week (always running)
//   Thu 09:00 → Mon 09:00        DRAFT window for NEXT week, IN PARALLEL with
//                                the live competition (overlaps Thu–Sun)
//   Mon 09:00                    rollover: drafted team goes live, the outgoing
//                                week settles
// The competition is continuous (there is always a "current week"); drafting is
// a separate, overlapping window. So instead of one mutually-exclusive phase we
// expose `isDraftOpen()`, and keep a best-effort `getCompetitionPhase()` only
// for legacy display code. All boundaries read Israel wall-time via
// `getIsraelParts`, never the raw device clock.

/**
 * Is the draft for NEXT week's competition open right now?
 * True from Thursday 09:00 (IL) through Monday 09:00 (IL).
 */
export function isDraftOpen(now: Date = new Date()): boolean {
  const { dayOfWeek: d, timeDecimal: t } = getIsraelParts(now);
  const thuAfter9 = d === 4 && t >= 9;
  const friSatSun = d === 5 || d === 6 || d === 0;
  const monBefore9 = d === 1 && t < 9;
  return thuAfter9 || friSatSun || monBefore9;
}

/**
 * Legacy single-phase view (Israel time), kept for older display code. With the
 * parallel model there is always a live competition, so this returns `'draft'`
 * while the draft window is open and `'competition'` otherwise.
 */
export function getCompetitionPhase(now: Date = new Date()): CompetitionPhase {
  return isDraftOpen(now) ? 'draft' : 'competition';
}

/**
 * ISO weekId "YYYY-WNN" on Sun-start weeks. UNCHANGED — used OUTSIDE fantasy as
 * a weekly rotation key (crowd-wisdom BTC slider, TA-35 forecast). Do NOT
 * re-anchor this; the competition cycle uses `getCompetitionWeekId` instead.
 */
export function getCurrentWeekId(now: Date = new Date()): string {
  const d = new Date(now);
  // Shift to nearest Sunday as week start
  d.setDate(d.getDate() - d.getDay());
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Competition week id = the Israel calendar date ("YYYY-MM-DD") of the Monday
 * that STARTED the current competition week (its 09:00 boundary). Sortable and
 * DST-proof (pure IL-date arithmetic). Flips exactly at Monday 09:00 IL — the
 * rollover instant — so comparing an entry's weekId to this tells us cleanly
 * whether it belongs to the live week, a past week, or the upcoming one.
 */
export function getCompetitionWeekId(now: Date = new Date()): string {
  const { dayOfWeek, timeDecimal } = getIsraelParts(now);
  const todayISO = getIsraelDateISO(now);
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Sun→6, Mon→0, … Sat→5
  // On Monday before 09:00 the new week hasn't begun yet → last Monday.
  const back = daysSinceMonday + (dayOfWeek === 1 && timeDecimal < 9 ? 7 : 0);
  return israelDatePlusDays(todayISO, -back);
}

/** The competition week id the draft is FOR — the upcoming Monday (current + 7d). */
export function getNextCompetitionWeekId(now: Date = new Date()): string {
  return israelDatePlusDays(getCompetitionWeekId(now), 7);
}

/**
 * Absolute Date of the next Israel-local `weekday` at `hour:minute`, for
 * countdown display. The Israel↔UTC offset is read from `now` (either +2 or
 * +3), so it's exact to the minute except within the ~1h around a DST switch —
 * cosmetic, since the real rollover uses date-anchored ids, not this.
 */
function nextIsraelWeekdayAt(now: Date, weekday: number, hour: number, minute: number): Date {
  const parts = getIsraelParts(now);
  const utcNowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const ilNowMin = parts.hour * 60 + parts.minute;
  let offsetMin = ilNowMin - utcNowMin;
  if (offsetMin > 14 * 60) offsetMin -= 24 * 60;
  if (offsetMin < -14 * 60) offsetMin += 24 * 60;

  const targetDecimal = hour + minute / 60;
  let delta = (weekday - parts.dayOfWeek + 7) % 7;
  if (delta === 0 && parts.timeDecimal >= targetDecimal) delta = 7;

  const targetISO = israelDatePlusDays(getIsraelDateISO(now), delta);
  const [y, mo, d] = targetISO.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hour, minute) - offsetMin * 60_000);
}

/** Next draft open: upcoming Thursday 09:00 (IL) — the parallel window opens. */
export function getNextDraftOpen(now: Date = new Date()): Date {
  return nextIsraelWeekdayAt(now, 4, 9, 0);
}

/** Competition end / rollover: upcoming Monday 09:00 (IL). */
export function getCompetitionEnd(now: Date = new Date()): Date {
  return nextIsraelWeekdayAt(now, 1, 9, 0);
}

/** Draft close: upcoming Monday 09:00 (IL) — the same instant the new week begins. */
export function getDraftClose(now: Date = new Date()): Date {
  return nextIsraelWeekdayAt(now, 1, 9, 0);
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
        mockPrice: 222.30,
        mockWeeklyChange: 2.4,
        sharkAnalysis:
          'אפל ממשיכה לשלוט בשוק הסמארטפונים עם שולי רווח עצומים. מחזור ה-Services צומח ב-15% שנה-על-שנה ומציע יציבות אמיתית. אני מאמין שהמניה מוצאת תמיכה חזקה ב-$200 לפני כל תנועה לכיוון $230.',
      },
      {
        ticker: 'NVDA',
        name: 'NVIDIA',
        tagline: 'מלך הבינה המלאכותית',
        categoryId: 'tech',
        mockPrice: 155.40,
        mockWeeklyChange: 5.1,
        sharkAnalysis:
          'NVIDIA היא המנוע האמיתי של מהפכת ה-AI. אחרי 10:1 split ביוני 2024, המניה נגישה ליותר משקיעים. ביקוש ל-GPU למרכזי נתונים ממשיך לרסק שיאים. סיכון: תמחור גבוה — אבל אם ה-AI ממשיך לגדול, NVDA תוביל.',
      },
      {
        ticker: 'GOOGL',
        name: 'Alphabet',
        tagline: 'אדוני החיפוש',
        categoryId: 'tech',
        mockPrice: 198.60,
        mockWeeklyChange: 1.8,
        sharkAnalysis:
          'גוגל מחזיקה ב-92% מחיפוש הגלובלי — הגנה עסקית שקשה לשבור. Google Cloud צומח ב-28% ומאיים על AWS. האתגר הגדול: שילוב Gemini ב-Search בלי לפגוע בהכנסות מפרסום.',
      },
      {
        ticker: 'META',
        name: 'Meta',
        tagline: 'אימפריית הרשתות החברתיות',
        categoryId: 'tech',
        mockPrice: 702.80,
        mockWeeklyChange: 3.2,
        sharkAnalysis:
          'Meta שינתה כיוון דרמטית — מ"Year of Efficiency" להשקעות AI מסיביות. Family of Apps מייצרת $40B+ רווח תפעולי. Quest 3 ו-Ray-Ban Glasses פותחים שוק חדש. זה לא רק פייסבוק.',
      },
      {
        ticker: 'MSFT',
        name: 'Microsoft',
        tagline: 'ענקית התוכנה',
        categoryId: 'tech',
        mockPrice: 492.40,
        mockWeeklyChange: 1.5,
        sharkAnalysis:
          'מיקרוסופט הפכה ל-AI infrastructure company עם Copilot ו-Azure OpenAI. הכנסות Azure צמחו 31% — ומשמשות כבסיס לכל שירותי ה-AI הארגוניים. המניה יציבה יחסית עם דיבידנד.',
      },
      {
        ticker: 'TSLA',
        name: 'Tesla',
        tagline: 'חלוצת הרכב החשמלי',
        categoryId: 'tech',
        mockPrice: 376.50,
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
        mockPrice: 99.80,
        mockWeeklyChange: 0.8,
        sharkAnalysis:
          'וולמארט היא ענקית הקמעונאות הגדולה בעולם — $650B מכירות שנתיות ומעל 10,500 חנויות. אחרי 3:1 split בפברואר 2024 המניה נגישה יותר. e-commerce צומח 25% שנתי וWalmart+ מתחרה ב-Amazon Prime. דיבידנד עולה 50 שנה ברצף.',
      },
      {
        ticker: 'KO',
        name: 'Coca-Cola',
        tagline: 'המותג מספר 1 בעולם',
        categoryId: 'energy',
        mockPrice: 71.60,
        mockWeeklyChange: 0.5,
        sharkAnalysis:
          'קוקה קולה — המותג המוכר בעולם, נמכר ב-200+ מדינות. Buffett מחזיק 9% מהמניה כי המודל פשוט: סירופ ב-cents, מותג של מיליארדים. דיבידנד עולה 62 שנה ברציפות — Dividend King.',
      },
      {
        ticker: 'PG',
        name: 'Procter & Gamble',
        tagline: 'מותגי הצרכן הקלאסיים',
        categoryId: 'energy',
        mockPrice: 168.40,
        mockWeeklyChange: 0.6,
        sharkAnalysis:
          'P&G הוא בית של Tide, Pampers, Gillette ועוד — 65 מותגים שבכל בית. Pricing power חזק במיוחד באינפלציה. דיבידנד עולה 68 שנה ברצף. defensive play קלאסי לכל סוגי השוק.',
      },
      {
        ticker: 'JNJ',
        name: 'Johnson & Johnson',
        tagline: 'ענקית בריאות-צרכן',
        categoryId: 'energy',
        mockPrice: 164.20,
        mockWeeklyChange: 0.4,
        sharkAnalysis:
          'JNJ היא Healthcare giant עם 130 שנה של רצף. AAA credit rating — אחד מ-2 בלבד באמריקה. דיבידנד עולה 61 שנה ברצף. עבר spin-off של Kenvue, נשאר עם pharma + medical devices — שני הסקטורים הכי חזקים.',
      },
      {
        ticker: 'BRK.B',
        name: 'Berkshire Hathaway',
        tagline: 'האימפריה של באפט',
        categoryId: 'energy',
        mockPrice: 508.70,
        mockWeeklyChange: 1.1,
        sharkAnalysis:
          'ברקשייר היא ה-conglomerate של וורן באפט — מחזיקה Apple, Coca-Cola, GEICO, BNSF Railway ועוד עשרות חברות. $300B+ במזומן מוכן להזדמנויות. אין דיבידנד — באפט מעדיף buybacks. רכוש אותה כדי לישון בשקט.',
      },
      {
        ticker: 'MCD',
        name: "McDonald's",
        tagline: 'הקשתות הזהובות',
        categoryId: 'energy',
        mockPrice: 308.40,
        mockWeeklyChange: 0.7,
        sharkAnalysis:
          'מקדונלדס היא במהותה חברת נדל"ן שמשכירה מסעדות לזכיינים. 40,000+ סניפים גלובליים, רובם מתופעלים ע"י זכיינים — מודל הון נמוך, תזרים גבוה. דיבידנד עולה 48 שנה ברצף. recession-proof.',
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
        mockPrice: 71.40,
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
        mockPrice: 1620.00,
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
        mockPrice: 47.30,
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
        mockPrice: 41.80,
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
        mockPrice: 218.50,
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
          'בזק היא תשתית הסיב האופטי, הסלולר (פלאפון) והטלוויזיה (yes) של ישראל. רגולציה מקלה אפשרה reorg ארגוני. תזרים מזומנים יציב, דיבידנד אטרקטיבי. בחירה דפנסיבית על תשתית.',
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
        mockPrice: 104_500,
        mockWeeklyChange: 3.8,
        sharkAnalysis:
          'ביטקוין הוא "זהב דיגיטלי" — 21 מיליון יחידות בלבד לעולם. ה-Halving של אפריל 2024 הפחית היצע חדש, ו-ETF-ים מוסדיים (BlackRock, Fidelity) צוברים מיליארדים. ההיסטוריה מראה: אחרי Halving, מגיע Bull run. אני כאן.',
      },
      {
        ticker: 'ETH',
        name: 'Ethereum',
        tagline: 'פלטפורמת החוזים החכמים',
        categoryId: 'crypto',
        mockPrice: 3_820,
        mockWeeklyChange: 2.9,
        sharkAnalysis:
          'אית\'ריום היא תשתית האפליקציות הדצנטרליזציות — DeFi, NFT, Layer 2. Staking מוריד supply בשוק. ה-Layer 2 ecosystem (Arbitrum, Optimism, Base) צומח ומחזק ETH כנכס reserve.',
      },
      {
        ticker: 'SOL',
        name: 'Solana',
        tagline: 'המהיר שביניהם',
        categoryId: 'crypto',
        mockPrice: 192.40,
        mockWeeklyChange: 6.1,
        sharkAnalysis:
          'סולנה היא הרשת הכי מהירה (65K tx/sec) והזולה. Meme coins, DePIN וDeFi פועלים כאן בעלות שבריר. Firedancer upgrade יגדיל throughput פי 10. תנודתיות גבוהה — פוטנציאל גבוה.',
      },
      {
        ticker: 'BNB',
        name: 'BNB',
        tagline: 'מטבע הבורסה',
        categoryId: 'crypto',
        mockPrice: 648.30,
        mockWeeklyChange: 1.4,
        sharkAnalysis:
          'BNB הוא המטבע של Binance — הבורסה הגדולה בעולם. Fee discounts, BNB Chain DApps וLaunchpad נותנים ל-BNB ערך utility אמיתי. הסיכון הרגולטורי על Binance ידוע — ומתומחר חלקית.',
      },
      {
        ticker: 'ADA',
        name: 'Cardano',
        tagline: 'הבלוקצ׳יין האקדמי',
        categoryId: 'crypto',
        mockPrice: 0.71,
        mockWeeklyChange: 4.5,
        sharkAnalysis:
          'קרדנו מפותח בגישה "peer-reviewed" — כל קוד עובר מחקר אקדמי. Hydra protocol יאפשר מיליוני tx/sec. עדיין מאחורי Ethereum ו-Solana באימוץ — אבל הבסיס הטכני חזק מאוד.',
      },
      {
        ticker: 'DOGE',
        name: 'Dogecoin',
        tagline: 'ה-Meme שהפך אמיתי',
        categoryId: 'crypto',
        mockPrice: 0.22,
        mockWeeklyChange: 8.3,
        sharkAnalysis:
          'דוג\'קוין התחיל כבדיחה — אבל קהילה של מיליונים ותמיכת Elon Musk הפכו אותו לאמיתי. X (טוויטר) שוקל קבלת DOGE כתשלום. ספקולציה טהורה עם upside מטורף — וגם downside בהתאם.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Portfolio-builder-only universe (בונה התיקים) — INDICES category (מדדים)
// ---------------------------------------------------------------------------
//
// The community portfolio COMPOSER lets users build & share a free portfolio,
// and Yoav asked to add an "indices" (מדדים) category. It is deliberately kept
// OUT of the shared STOCK_CATEGORIES (and out of the StockCategoryId union):
// the fantasy-league DRAFT reuses STOCK_CATEGORIES with exhaustive
// Record<StockCategoryId, …> maps + a DraftCategoryTabs palette that have NO
// 'indices' entry and NO fallback (TAB_PALETTE[cat.id].color would crash on a
// 6th tab). The composer + the share card, by contrast, resolve colors via
// `F2_SECTORS[…] ?? F2_SECTORS.tech`, so an unknown 'indices' sector safely
// falls back to the tech-blue. So indices ride ONLY in the export below.
//
// mockWeeklyChange is 0 for every index on purpose — we do NOT fabricate a
// weekly move for a real index; 0 is the honest "unknown until measured" value.

type PortfolioCategoryId = StockCategoryId | 'indices';

const INDICES_CATEGORY: Omit<StockCategory, 'id' | 'stocks'> & {
  id: PortfolioCategoryId;
  stocks: Array<Omit<DraftStock, 'categoryId'> & { categoryId: PortfolioCategoryId }>;
} = {
  id: 'indices',
  label: 'מדדים',
  emoji: '📊',
  description:
    'המדדים הגדולים בישראל ובעולם — במקום מניה בודדת, סל שלם במכה אחת. ' +
    'מת"א 125 ועד S&P 500 — פיזור רחב ופחות תלות בחברה אחת.',
  stocks: [
    {
      ticker: 'TA125',
      name: 'ת"א 125',
      tagline: 'הדופק של הבורסה בתל אביב',
      categoryId: 'indices',
      mockPrice: 2_950,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד ת"א 125 עוקב אחרי 125 החברות הגדולות בבורסת תל אביב — חתיכה מכל השוק הישראלי במדד אחד.',
    },
    {
      ticker: 'TA35',
      name: 'ת"א 35',
      tagline: '35 הגדולות בתל אביב',
      categoryId: 'indices',
      mockPrice: 2_750,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד ת"א 35 מרכז את 35 החברות הכי גדולות בתל אביב — היציבות של השוק המקומי.',
    },
    {
      ticker: 'TABANK',
      name: 'ת"א בנקים',
      tagline: 'כל הבנקים במדד אחד',
      categoryId: 'indices',
      mockPrice: 4_600,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד ת"א בנקים עוקב אחרי מניות הבנקים הגדולים בישראל — נע עם הריבית ועם בריאות המשק.',
    },
    {
      ticker: 'TA90',
      name: 'ת"א 90',
      tagline: 'החברות הבינוניות של תל אביב',
      categoryId: 'indices',
      mockPrice: 3_600,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד ת"א 90 מכסה את 90 החברות הבינוניות שמתחת לת"א 35 — קצת יותר תנועה, קצת יותר סיכון.',
    },
    {
      ticker: 'SPX',
      name: 'S&P 500',
      tagline: '500 הגדולות באמריקה',
      categoryId: 'indices',
      mockPrice: 6_100,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד S&P 500 עוקב אחרי 500 החברות הגדולות בארה"ב — המראה הכי מוכרת בעולם לשוק האמריקאי.',
    },
    {
      ticker: 'NDX',
      name: 'נאסד"ק 100',
      tagline: 'לב הטכנולוגיה האמריקאית',
      categoryId: 'indices',
      mockPrice: 22_000,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד נאסד"ק 100 מרכז את 100 חברות הטכנולוגיה והצמיחה הגדולות בנאסד"ק — כבד בטק, תנודתי יותר.',
    },
    {
      ticker: 'DJI',
      name: 'דאו ג׳ונס',
      tagline: '30 הוותיקות של וול סטריט',
      categoryId: 'indices',
      mockPrice: 44_500,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד דאו ג׳ונס עוקב אחרי 30 חברות ענק ותיקות בארה"ב — המדד הוותיק והמסורתי של וול סטריט.',
    },
    {
      ticker: 'RUT',
      name: 'ראסל 2000',
      tagline: '2000 החברות הקטנות של ארה"ב',
      categoryId: 'indices',
      mockPrice: 2_350,
      mockWeeklyChange: 0,
      sharkAnalysis:
        'מדד ראסל 2000 עוקב אחרי 2,000 חברות קטנות בארה"ב — מודד את התיאבון של השוק לחברות הצומחות.',
    },
  ],
};

/**
 * Category list for the community portfolio COMPOSER only = the shared draft
 * universe + the indices (מדדים) category. Cast to StockCategory[] because
 * 'indices' is intentionally NOT a StockCategoryId (see note above); every color
 * lookup in the composer + share card is fallback-guarded, so the cast is safe
 * at runtime. Do NOT feed this list into the fantasy-league draft screens.
 */
export const PORTFOLIO_BUILDER_CATEGORIES: StockCategory[] = [
  ...STOCK_CATEGORIES,
  INDICES_CATEGORY as StockCategory,
];

// ---------------------------------------------------------------------------
// Leaderboard (P0-1: fabrication + real-economy leak REMOVED)
// ---------------------------------------------------------------------------
//
// This board used to be fabricated from a fixed MOCK_NAMES list + seededRandom,
// and `claimResults` paid REAL coins/XP/diamonds based on the user's rank vs
// those invented opponents — both fabrication AND a genuine coin leak.
//
// Under the founder's iron rule (zero fabricated data) there are NO fake
// competitors. Until a server-side cron settles real, registered competitors,
// `getMockLeaderboard` returns an EMPTY array. The only honest entry is the
// user's own row (added by `getLeaderboardWithLocal` in the store), and the
// prize payout is frozen (see useFantasyStore.claimResults).

/** Honest empty-state copy for the fantasy leaderboard (no fake opponents). */
export const FANTASY_LEAGUE_EMPTY_STATE_TITLE = 'הליגה הראשונה נפתחת — היו הראשונים';

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Real registered competitors only. There is no server settle yet, so there
 * are no opponents to show — returns an empty board (honest empty state).
 * Signature is preserved so existing consumers keep compiling; when a real
 * server endpoint lands it can populate this list.
 */
export function getMockLeaderboard(
  _tier: string,
  _weekId: string,
): FantasyLeaderboardEntry[] {
  return [];
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
  'אסור להחליף מניות לאחר נעילת הדראפט ביום שני 09:00',
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
