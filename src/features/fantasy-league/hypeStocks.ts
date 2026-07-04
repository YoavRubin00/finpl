import type { DraftStock, StockCategory } from './fantasyTypes';

// ---------------------------------------------------------------------------
// "טרנד/הייפ" — the sixth draft category (Yoav 2026-07-04)
// ---------------------------------------------------------------------------
// A pool of momentum / retail-buzz names — the stocks people actually argue
// about on Reddit / investing forums (r/wallstreetbets & co). Each week a
// rotating window of `HYPE_WEEKLY_COUNT` of them is surfaced in the draft, so
// "this week's hype" keeps changing. These are the most VOLATILE picks in the
// game — high ceiling, high floor-through — and the shark blurbs say so
// honestly (Captain Shark voice: singular, energetic, no false promises).
//
// mockPrice / mockWeeklyChange are only offline fallbacks; live weekly returns
// come from the same Yahoo path as every other pick when available.

export const HYPE_WEEKLY_COUNT = 6;

export const HYPE_POOL: DraftStock[] = [
  {
    ticker: 'IREN',
    name: 'IREN',
    tagline: 'כרייה שהפכה ל-AI',
    categoryId: 'hype',
    mockPrice: 15.4,
    mockWeeklyChange: 12.3,
    currency: '$',
    sharkAnalysis:
      'התחילה ככורה ביטקוין והיום משכירה כוח-מחשוב ל-AI. הסיפור חם, התנודתיות פראית — קופצת עשרות אחוזים בשבוע לכל כיוון. פה נכנסים רק עם בטן חזקה.',
  },
  {
    ticker: 'SMCI',
    name: 'Super Micro',
    tagline: 'שרתי ה-AI',
    categoryId: 'hype',
    mockPrice: 44.8,
    mockWeeklyChange: 7.9,
    currency: '$',
    sharkAnalysis:
      'בונה את השרתים שמריצים את מהפכת ה-AI. הביקוש אמיתי, אבל היו כאן סימני-שאלה חשבונאיים שזרקו את המניה בחדות. פוטנציאל גדול לצד סיכון גדול.',
  },
  {
    ticker: 'PLTR',
    name: 'Palantir',
    tagline: 'ביג-דאטה לממשלות',
    categoryId: 'hype',
    mockPrice: 74.6,
    mockWeeklyChange: 4.2,
    currency: '$',
    sharkAnalysis:
      'חביבת המשקיעים הקטנים — פלטפורמת נתונים לצבא ולתאגידים. הצמיחה יפה, אבל התמחור מתומחר לחלומות. כל דוח מזיז אותה חזק.',
  },
  {
    ticker: 'RGTI',
    name: 'Rigetti',
    tagline: 'מחשוב קוונטי',
    categoryId: 'hype',
    mockPrice: 13.9,
    mockWeeklyChange: 17.5,
    currency: '$',
    sharkAnalysis:
      'הימור על המחשוב הקוונטי — טכנולוגיה של מחר, הכנסות של היום עדיין קטנטנות. מניה זעירה שזזה כמו רכבת הרים. ריגוש גבוה, ודאות נמוכה.',
  },
  {
    ticker: 'SOUN',
    name: 'SoundHound AI',
    tagline: 'AI קולי',
    categoryId: 'hype',
    mockPrice: 13.2,
    mockWeeklyChange: 9.1,
    currency: '$',
    sharkAnalysis:
      'בינה מלאכותית שמבינה דיבור — משתלבת ברכבים ובמסעדות. סיפור-צמיחה מסקרן, אבל עדיין מפסידה כסף. הימור-מומנטום קלאסי.',
  },
  {
    ticker: 'MSTR',
    name: 'Strategy',
    tagline: 'ביטקוין ממונף',
    categoryId: 'hype',
    mockPrice: 382.0,
    mockWeeklyChange: 6.4,
    currency: '$',
    sharkAnalysis:
      'חברת תוכנה שהפכה למאגר ביטקוין ענק — בפועל היא מהמר ממונף על מטבע אחד. עולה ויורדת עם הביטקוין, רק חזק יותר. לא לבעלי לב חלש.',
  },
  {
    ticker: 'RKLB',
    name: 'Rocket Lab',
    tagline: 'רקטות לחלל',
    categoryId: 'hype',
    mockPrice: 24.7,
    mockWeeklyChange: 8.3,
    currency: '$',
    sharkAnalysis:
      'משגרת לוויינים לחלל ובונה רקטה גדולה חדשה. השוק ענק והחלום גדול, אבל עדיין שורפת מזומן. סיפור לטווח ארוך עם תנודות בדרך.',
  },
  {
    ticker: 'LUNR',
    name: 'Intuitive Machines',
    tagline: 'נחיתה על הירח',
    categoryId: 'hype',
    mockPrice: 12.1,
    mockWeeklyChange: -5.6,
    currency: '$',
    sharkAnalysis:
      'נחתה על הירח בחסות נאס"א — כל חוזה ממשלתי מקפיץ אותה, כל עיכוב מפיל. מניית-חדשות טהורה. מרגש, אבל הימור.',
  },
  {
    ticker: 'HOOD',
    name: 'Robinhood',
    tagline: 'הברוקר של הדור',
    categoryId: 'hype',
    mockPrice: 55.3,
    mockWeeklyChange: 5.0,
    currency: '$',
    sharkAnalysis:
      'האפליקציה שדרכה הדור הצעיר סוחר — מרוויחה יותר כשהשוק לוהט. חשופה לגמרי לסנטימנט הקמעונאי, ולכן קופצת חזק בשני הכיוונים.',
  },
  {
    ticker: 'GME',
    name: 'GameStop',
    tagline: 'מלך המם',
    categoryId: 'hype',
    mockPrice: 23.8,
    mockWeeklyChange: 3.1,
    currency: '$',
    sharkAnalysis:
      'המניה שהתחילה את כל מהפכת המניות-מם. העסק עצמו בינוני, אבל הקהילה מזיזה אותה. פה קונים סיפור וסנטימנט, לא מאזן — וזוכרים את זה.',
  },
];

/**
 * Deterministic weekly rotation: a window of `count` names starting at an
 * offset hashed from `weekKey`, so the surfaced set is stable within a week and
 * shifts each week (and cycles through the whole pool over time). No randomness
 * (which would break persistence/replays) — pure function of the week key.
 */
export function getHypeStocksForWeek(weekKey: string, count = HYPE_WEEKLY_COUNT): DraftStock[] {
  if (HYPE_POOL.length <= count) return HYPE_POOL;
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  }
  const start = hash % HYPE_POOL.length;
  const out: DraftStock[] = [];
  for (let i = 0; i < count; i++) {
    out.push(HYPE_POOL[(start + i) % HYPE_POOL.length]);
  }
  return out;
}

/**
 * The hype category for STOCK_CATEGORIES. `stocks` holds the FULL pool (so
 * ticker-prefetch + sector-colour maps see every hype ticker); the DRAFT grid
 * narrows to `getHypeStocksForWeek(nextWeekId)` so each week shows a fresh set.
 */
export const HYPE_CATEGORY: StockCategory = {
  id: 'hype',
  label: 'טרנד',
  emoji: '🔥',
  description:
    'המניות המדוברות של הרגע — מה שכל הפורומים והרדיט מדברים עליו השבוע. ' +
    'התנודתיות הכי גבוהה במשחק: תקרה גבוהה, אבל גם נפילות חדות. מתחלף כל שבוע.',
  stocks: HYPE_POOL,
};
