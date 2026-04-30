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
 *   Sun 09:00 → Sat 20:00  competition
 *   Thu 09:00 → Sun 09:00  draft (overlaps with competition Thu–Sat)
 *   Sat 20:00 → Thu 09:00  results / pre-draft
 */
export function getCompetitionPhase(now: Date = new Date()): CompetitionPhase {
  const day = now.getDay(); // 0=Sun … 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeDecimal = hour + minute / 60;

  const isSunAfter9 = day === 0 && timeDecimal >= 9;
  const isMon = day === 1;
  const isTue = day === 2;
  const isWed = day === 3;
  const isThuAfter9 = day === 4 && timeDecimal >= 9;
  const isFri = day === 5;
  const isSatBefore20 = day === 6 && timeDecimal < 20;
  const isSatAfter20 = day === 6 && timeDecimal >= 20;
  const isSunBefore9 = day === 0 && timeDecimal < 9;
  const isThuBefore9 = day === 4 && timeDecimal < 9;

  // Draft window: Thu 09:00 → Sun 09:00
  const inDraftWindow =
    isThuAfter9 || isFri || isSatBefore20 || isSatAfter20 || isSunBefore9;

  // Competition window: Sun 09:00 → Sat 20:00
  const inCompetition =
    isSunAfter9 || isMon || isTue || isWed || isThuBefore9 ||
    (day === 4 && timeDecimal < 9) || isFri || isSatBefore20;

  // Results: Sat 20:00 → Thu 09:00 (next week)
  const inResults = isSatAfter20 || isSunBefore9;

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

/** Next draft open time: upcoming Thursday 09:00 */
export function getNextDraftOpen(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilThu = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilThu);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Competition end: upcoming Saturday 20:00 */
export function getCompetitionEnd(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  d.setHours(20, 0, 0, 0);
  return d;
}

/** Draft close: upcoming Sunday 09:00 */
export function getDraftClose(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysUntilSun = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSun);
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
    prizeMultipliers: [3, 2, 1.5, 1.2, 1.1],
    prizeXP: [1000, 500, 300, 150, 100],
  },
  gold: {
    id: 'gold',
    label: 'ליגת הזהב',
    emoji: '🥇',
    entryCost: 10_000,
    prizeMultipliers: [3, 2, 1.5, 1.2, 1.1],
    prizeXP: [1000, 500, 300, 150, 100],
  },
  diamond: {
    id: 'diamond',
    label: 'ליגת היהלומים',
    emoji: '💎',
    entryCost: 100_000,
    prizeMultipliers: [3, 2, 1.5, 1.2, 1.1],
    prizeXP: [1000, 500, 300, 150, 100],
  },
};

// ---------------------------------------------------------------------------
// Stock universe — 5 categories × 6 stocks
// ---------------------------------------------------------------------------

export const STOCK_CATEGORIES: StockCategory[] = [
  {
    id: 'tech',
    label: 'טכנולוגיה',
    emoji: '🤖',
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
    id: 'banks',
    label: 'בנקים',
    emoji: '🏦',
    stocks: [
      {
        ticker: 'JPM',
        name: 'JPMorgan Chase',
        tagline: 'הבנק הגדול בעולם',
        categoryId: 'banks',
        mockPrice: 198.40,
        mockWeeklyChange: 1.1,
        sharkAnalysis:
          'ג\'יי-פי-מורגן הוא הבנק החזק ביותר בעולם — $50B+ רווח שנתי, הנהגה מעולה ויציבות בכל תרחיש שוק. סביבת ריביות גבוהות מגדילה הכנסות ריבית. זה ה"Blue Chip" האולטימטיבי בסקטור.',
      },
      {
        ticker: 'GS',
        name: 'Goldman Sachs',
        tagline: 'בנק ההשקעות האגדי',
        categoryId: 'banks',
        mockPrice: 453.20,
        mockWeeklyChange: 2.3,
        sharkAnalysis:
          'גולדמן סאקס חוזר לשורשים — עסקאות, השקעות וניהול עושר. האסטרטגיה הצרכנית Marcus נגמרה, והמיקוד חזר ל-Trading ו-IB. IPO boom מחכה ברביע הראשון.',
      },
      {
        ticker: 'BAC',
        name: 'Bank of America',
        tagline: 'בנק אמריקה',
        categoryId: 'banks',
        mockPrice: 38.90,
        mockWeeklyChange: 0.8,
        sharkAnalysis:
          'BofA הוא הבנק הקמעוני הגדול בארה"ב עם 67M לקוחות. הכנסות ריבית ייהנו ממדיניות Fed. הסיכון: חשיפה לאגרות חוב ארוכות שנפגעו בעלייה הריבית — אבל זה כבר מתומחר.',
      },
      {
        ticker: 'WFC',
        name: 'Wells Fargo',
        tagline: 'הפמיליה הבנקאית',
        categoryId: 'banks',
        mockPrice: 54.60,
        mockWeeklyChange: 1.4,
        sharkAnalysis:
          'וולס פארגו סיים את ה-asset cap שהוטל עליו ב-2018 — פוטנציאל צמיחה עצום. מנהיג חדש, מיקוד חדש. המניה נסחרת בדיסקאונט על שאר הבנקים הגדולים.',
      },
      {
        ticker: 'MS',
        name: 'Morgan Stanley',
        tagline: 'עושי העסקאות',
        categoryId: 'banks',
        mockPrice: 97.30,
        mockWeeklyChange: 1.9,
        sharkAnalysis:
          'מורגן סטנלי הפך לחברת ניהול עושר מהולה עם Wealth Management מייצר $7B+ הכנסות. E*Trade נותן גישה לשוק הקמעוני. פחות תנודתי מ-Goldman.',
      },
      {
        ticker: 'C',
        name: 'Citigroup',
        tagline: 'הבנק הגלובלי',
        categoryId: 'banks',
        mockPrice: 64.80,
        mockWeeklyChange: -0.5,
        sharkAnalysis:
          'סיטי עובר reorg ארגוני מסיבי — מנכ"לית ג\'יין פרייזר מפשטת את המבנה. המניה נסחרת מתחת לBook Value, מה שמציע פוטנציאל upside אם הרה-ארגון מצליח. high risk, high reward.',
      },
    ],
  },
  {
    id: 'energy',
    label: 'אנרגיה',
    emoji: '⚡',
    stocks: [
      {
        ticker: 'XOM',
        name: 'ExxonMobil',
        tagline: 'ענק הנפט',
        categoryId: 'energy',
        mockPrice: 112.40,
        mockWeeklyChange: 0.9,
        sharkAnalysis:
          'אקסון מוביל היא הנפט שלא הולך לשום מקום — $36B רווח שנתי ודיבידנד גדל 40 שנה ברציפות. רכישת Pioneer הופכת אותה לאחת מגדולות שדות הפרמייאן. אנרגיה עדיין שולטת.',
      },
      {
        ticker: 'CVX',
        name: 'Chevron',
        tagline: 'כוח האנרגיה',
        categoryId: 'energy',
        mockPrice: 154.70,
        mockWeeklyChange: 1.2,
        sharkAnalysis:
          'שברון מציעה ייצור נפט וגז עם balance sheet חזקה. buyback program מסיבי מחזיר ערך לבעלי מניות. המניה פחות תנודתית ממחיר הנפט הגולמי, מה שמעניק ביטחון יחסי.',
      },
      {
        ticker: 'BP',
        name: 'BP plc',
        tagline: 'הנפט הבריטי',
        categoryId: 'energy',
        mockPrice: 36.20,
        mockWeeklyChange: -0.3,
        sharkAnalysis:
          'BP עושה pivot לאנרגיה ירוקה תוך שמירה על רווחיות נפט. המניה נסחרת בדיסקאונט על מתחרותיה האמריקאיות — חלקית בגלל סיכון רגולטורי אירופאי. דיבידנד נדיב.',
      },
      {
        ticker: 'COP',
        name: 'ConocoPhillips',
        tagline: 'חברת הנפט העצמאית',
        categoryId: 'energy',
        mockPrice: 112.90,
        mockWeeklyChange: 1.7,
        sharkAnalysis:
          'קונוקו היא חברת E&P טהורה — חפירה וייצור בלבד, בלי זיקוק. זה אומר הכנסות ישירות ממחיר הנפט. חוב נמוך ו-buyback aggressive. מגיבה מהר לעלייה בנפט.',
      },
      {
        ticker: 'NEE',
        name: 'NextEra Energy',
        tagline: 'מלך האנרגיה המתחדשת',
        categoryId: 'energy',
        mockPrice: 73.40,
        mockWeeklyChange: 2.1,
        sharkAnalysis:
          'NextEra היא הגדולה בעולם באנרגיה מהרוח ומהשמש. Florida Power & Light מספקת תזרים יציב, וענף הסולאר צומח 25% שנתי. הריבית הגבוהה פגעה בה — אבל הורדת ריבית תהיה קטליסטור חיובי.',
      },
      {
        ticker: 'SLB',
        name: 'Schlumberger',
        tagline: 'שירותי הנפט',
        categoryId: 'energy',
        mockPrice: 46.80,
        mockWeeklyChange: 0.6,
        sharkAnalysis:
          'SLB (לשעבר Schlumberger) הוא הספק הגדול בעולם לשירותי קידוח. כל חברת נפט צריכה אותו. מרוויח ממחיר נפט גבוה דרך עלייה בקידוחים. Diversified גלובלית — ערבי, לטאם, צפון ים.',
      },
    ],
  },
  {
    id: 'health',
    label: 'בריאות',
    emoji: '💊',
    stocks: [
      {
        ticker: 'JNJ',
        name: 'Johnson & Johnson',
        tagline: 'ענק הבריאות',
        categoryId: 'health',
        mockPrice: 145.60,
        mockWeeklyChange: 0.7,
        sharkAnalysis:
          'J&J פיצלה את Kenvue (Consumer Health) ועכשיו מתמקדת בתרופות ובציוד רפואי. Darzalex ו-Stelara ממשיכים לצמוח. זה Blue Chip רפואי עם 60+ שנות דיבידנד גדל.',
      },
      {
        ticker: 'PFE',
        name: 'Pfizer',
        tagline: 'מפתחי החיסון',
        categoryId: 'health',
        mockPrice: 28.40,
        mockWeeklyChange: -1.5,
        sharkAnalysis:
          'פייזר נסחרת קרוב לשפל 10 שנים לאחר ירידת הכנסות קורונה. אבל pipeline חזק — תרופות לסרטן ו-RSV. בתמחור הנוכחי, הסיכוי/סיכון נוטה לטובה. דיבידנד של 6.5% נדיר בסקטור.',
      },
      {
        ticker: 'UNH',
        name: 'UnitedHealth',
        tagline: 'ביטוח הבריאות',
        categoryId: 'health',
        mockPrice: 512.80,
        mockWeeklyChange: 1.3,
        sharkAnalysis:
          'UnitedHealth היא חברת ביטוח הבריאות הגדולה בארה"ב עם 50M+ מבוטחים. מרווחי רווח עקביים גם בתקופות אי-ודאות. Optum Health (IT ורפואה ראשונית) מוסיפה stream הכנסות אחר.',
      },
      {
        ticker: 'ABT',
        name: 'Abbott',
        tagline: 'ציוד רפואי',
        categoryId: 'health',
        mockPrice: 111.30,
        mockWeeklyChange: 1.0,
        sharkAnalysis:
          'אבוט היא מנהיגה בציוד סוכרת (FreeStyle Libre) ובאבחון מהיר. Libre בלבד שווה יותר מ-$5B הכנסות שנתיות. הפנייה לניטור רצוף של גלוקוז — שוק שצומח 20%+ בשנה.',
      },
      {
        ticker: 'MRK',
        name: 'Merck',
        tagline: 'חברת התרופות',
        categoryId: 'health',
        mockPrice: 128.90,
        mockWeeklyChange: 2.0,
        sharkAnalysis:
          'מרק — Keytruda לסרטן הוא התרופה הנמכרת ביותר בעולם ב-2024 עם $25B+ הכנסות. Gardasil לHPV מתרחבת לאסיה. הפטנט של Keytruda פג ב-2028 — שנים של צמיחה לפני כן.',
      },
      {
        ticker: 'LLY',
        name: 'Eli Lilly',
        tagline: 'מהפכת הסוכרת והשמנה',
        categoryId: 'health',
        mockPrice: 798.50,
        mockWeeklyChange: 4.2,
        sharkAnalysis:
          'אלי לילי היא הסיפור הגדול ביותר בפארמה — Mounjaro ו-Zepbound (GLP-1) משנות טיפול בסוכרת ובהשמנה. שוק GLP-1 יכול לגדול ל-$100B+ עד 2030. המניה יקרה — אבל הצמיחה מצדיקה.',
      },
    ],
  },
  {
    id: 'crypto',
    label: 'קריפטו',
    emoji: '₿',
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
    const pos = i < 3 ? 'promoted' : i > 11 ? 'demoted' : 'stable';
    return {
      rank: i + 1,
      playerId: `ai-${String(i).padStart(2, '0')}`,
      displayName: name,
      returnPercent: Math.round(returnPct * 10) / 10,
      isLocal: false,
      change: change as FantasyLeaderboardEntry['change'],
      leaguePosition: pos as FantasyLeaderboardEntry['leaguePosition'],
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
        ? 'בחר מניה מקטגוריית האנרגיה'
        : 'בחר מניה מקטגוריית הבריאות',
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
