import type { DidYouKnowItem } from './types';

// Reused asset pool — pulls from existing IMAGES/ catalog, no new downloads.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_PIZZA = require('../../../../assets/IMAGES/fun/pizza_index.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_NVDA = require('../../../../assets/IMAGES/NVDA IR.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_FINN_PASSIVE = require('../../../../assets/infographics/finn-passive.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_FINN_FREEDOM = require('../../../../assets/infographics/finn-freedom.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_FINN_INFLATION = require('../../../../assets/infographics/finn-inflation.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_GOLD = require('../../../../assets/IMAGES/GOLD.jpg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_GEMS = require('../../../../assets/IMAGES/GEMS.jpg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_INVESTMENT = require('../../../../assets/IMAGES/INVESTMENT.jpg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_PRIZES = require('../../../../assets/IMAGES/PRIZES1.jpg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMG_FINSTARS = require('../../../../assets/IMAGES/FINSTARS.png');

/**
 * Curated "Did You Know?" facts presented by Finn in the feed.
 * All sums are publicly documented from cited sources.
 * Do not add any unverifiable claim here — this feature's value depends on trust.
 */
export const DID_YOU_KNOW_ITEMS: DidYouKnowItem[] = [
  // ─── 🇮🇱 ישראל מרוויחה ───
  {
    id: 'dyk-il-mobileye',
    category: 'israel',
    teaser: 'Mobileye — חברת ישראלית לטכנולוגיית רכב אוטונומי. כמה שילמה אינטל ב-2017?',
    punch: '15.3 מיליארד דולר. חמש שנים אחר כך אינטל החזירה אותה לבורסה — וקיבלה 15.3 נוספים. הרוויחו כפול, בלי למכור.',
    highlight: '15.3 מיליארד $',
    source: 'Intel 2017 · SEC 2022',
    emoji: '🚗',
  },
  {
    id: 'dyk-il-waze',
    category: 'israel',
    teaser: 'Waze נוסדה ע"י 3 ישראלים ב-2008. כמה שילמה גוגל ב-2013?',
    punch: '1.15 מיליארד דולר — המייסדים קיבלו ~300M כל אחד. הייתה העסקה הגדולה בישראל באותו עשור.',
    highlight: '1.15 מיליארד $',
    source: 'Reuters · TheMarker 2013',
    emoji: '🚦',
  },
  {
    id: 'dyk-il-icq',
    category: 'israel',
    teaser: '4 ישראלים צעירים המציאו את ICQ ב-1996. כמה שילמה AOL שנתיים אחרי?',
    punch: '287 מיליון דולר במזומן. ארבעת המייסדים של Mirabilis הפכו למיליונרים בגיל 30.',
    highlight: '287 מיליון $',
    source: 'Ha\'aretz · AOL press 1998',
    emoji: '💬',
  },
  {
    id: 'dyk-il-mellanox',
    category: 'israel',
    teaser: 'Mellanox — חברת שבבים ישראלית. כמה NVIDIA שילמה עליה ב-2020?',
    punch: '6.9 מיליארד דולר. המייסד אייל וולדמן הפך לדמות מפתח בתעשיית ה-AI העולמית.',
    highlight: '6.9 מיליארד $',
    source: 'NVIDIA IR 2020',
    emoji: '🧠',
    image: IMG_NVDA,
  },
  {
    id: 'dyk-il-etoro',
    category: 'israel',
    teaser: 'eToro ניסתה IPO כבר ב-2022 (SPAC של $10.4B) וזה בוטל. באיזה שווי הם יצאו בסוף, במאי 2025?',
    punch: '4.2 מיליארד דולר ב-Nasdaq — פחות מחצי מהשאיפה המקורית. 4 שנים של ניסיון חוזר.',
    highlight: '4.2 מיליארד $',
    source: 'SEC filings · Calcalist 2025',
    emoji: '📈',
    image: IMG_INVESTMENT,
  },
  {
    id: 'dyk-il-neumann',
    category: 'israel',
    teaser: 'אדם נוימן, ישראלי, הקים את WeWork. השווי שלה הגיע ל-$47B ב-2019 לפני שהחברה קרסה. כמה SoftBank שילמה לו אישית כדי ללכת?',
    punch: '1.7 מיליארד דולר "דמי יציאה" — כדי שיצא מהחברה שבנה. אולי העסקה הטובה ביותר אחרי הקריסה.',
    highlight: '1.7 מיליארד $',
    source: 'Bloomberg · WSJ 2019',
    emoji: '🏢',
    image: IMG_PRIZES,
  },
  {
    id: 'dyk-il-gadot-bird',
    category: 'israel',
    teaser: 'גל גדות השקיעה ב-Bird (סקוטרים) ב-2018. מה קרה לחברה?',
    punch: 'פשטה רגל ב-2023 בהפסד ~90% מהשיא ($2.5B). גם לכוכבת אקשן יש השקעות לא מוצלחות.',
    highlight: 'ירידה של 90%',
    source: 'Bloomberg 2023',
    emoji: '🛴',
  },

  // ─── 🌍 המסחר הגדול ───
  {
    id: 'dyk-ws-soros-1992',
    category: 'wallstreet',
    teaser: 'ב-16/9/1992 ג\'ורג\' סורוס הימר נגד הפאונד הבריטי. כמה הרוויח ביום אחד?',
    punch: 'מעל מיליארד דולר ב-24 שעות. "שבר את בנק אנגליה" — הבנק המרכזי נאלץ לצאת ממנגנון המטבע האירופי.',
    highlight: 'מעל מיליארד $',
    source: 'FT · The Economist 1992',
    emoji: '💷',
  },
  {
    id: 'dyk-ws-buffett-first',
    category: 'wallstreet',
    teaser: 'באפט קנה את המניה הראשונה שלו בגיל 11, ב-1942. בכמה כסף?',
    punch: '38 דולר בלבד — 6 מניות של Cities Service. 82 שנים אחר כך ההון שלו: ~150 מיליארד דולר. זה כוחו של זמן.',
    highlight: '150 מיליארד $',
    source: 'Berkshire letters · "Snowball"',
    emoji: '🧓',
    image: IMG_FINN_PASSIVE,
  },
  {
    id: 'dyk-ws-burry',
    category: 'wallstreet',
    teaser: 'מייקל בארי צפה את קריסת הסאב-פריים ב-2005 וקנה CDS נגד משכנתאות. כמה הרוויח אישית?',
    punch: '725 מיליון דולר + 100M בעמלות. הוא היה הראשון שלא האמין למשכנתאות — ועשו עליו סרט.',
    highlight: '725 מיליון $',
    source: '"The Big Short" · SEC 13F',
    emoji: '🏠',
  },
  {
    id: 'dyk-ws-simons',
    category: 'wallstreet',
    teaser: 'ג\'ים סיימונס, פרופ\' למתמטיקה, הקים קרן בשם Renaissance Medallion. מה התשואה הממוצעת ב-30 שנים (1988-2018)?',
    punch: '66% בשנה ברוטו, 39% נטו — שיא עולמי בלתי מנוצח. סיימונס נפטר 2024 כמיליארדר של 31.',
    highlight: '66% בשנה',
    source: 'Zuckerman: "The Man Who Solved the Market"',
    emoji: '🧮',
    image: IMG_FINSTARS,
  },
  {
    id: 'dyk-ws-tepper-2009',
    category: 'wallstreet',
    teaser: 'דייויד טפר קנה מניות בנקים בתחתית של 2009. כמה הרוויח אישית באותה שנה?',
    punch: '4 מיליארד דולר בשנה אחת. המנהל הכי מרוויח בהיסטוריה של וול סטריט — עד אז.',
    highlight: '4 מיליארד $',
    source: 'Forbes Hedge Fund List 2009',
    emoji: '🏦',
  },
  {
    id: 'dyk-ws-gamestop',
    category: 'wallstreet',
    teaser: 'ינואר 2021 — WallStreetBets דחף את GameStop מ-$17 ל-$483. כמה הפסידה קרן Melvin?',
    punch: '7 מיליארד דולר ב-3 שבועות. הקרן קרסה לגמרי תוך שנה, למרות bailout של 3 מיליארד.',
    highlight: 'הפסד 7 מיליארד $',
    source: 'WSJ · Melvin filings 2021',
    emoji: '🎮',
  },
  {
    id: 'dyk-ws-ackman',
    category: 'wallstreet',
    teaser: 'פברואר 2020 — ביל אקמן קנה ביטוח אשראי ב-$27M רגע לפני הקורונה. כמה הרוויח?',
    punch: '2.6 מיליארד דולר תוך חודש. החזר פי 100. "העסקה הטובה בקריירה שלי".',
    highlight: 'פי 100',
    source: 'CNBC 2020 · Pershing Square',
    emoji: '😷',
    image: IMG_FINN_FREEDOM,
  },
  {
    id: 'dyk-ws-soros-quantum',
    category: 'wallstreet',
    teaser: 'קרן Quantum של סורוס פעלה 30 שנה (1969-1999). מה התשואה הממוצעת השנתית?',
    punch: '~30% בשנה אחרי עמלות. 1,000$ שהושקעו ב-1969 היו הופכים ל-4 מיליון ב-1999.',
    highlight: '30% בשנה',
    source: 'Steinhardt · Hedge Fund Wizards',
    emoji: '🧲',
  },

  // ─── ₿ עידן הקריפטו ───
  {
    id: 'dyk-crypto-pizza',
    category: 'crypto',
    teaser: '22/5/2010 — מתכנת בשם לאסלו שילם 10,000 BTC על 2 פיצות. כמה היו שוות הפיצות בשיא 2024?',
    punch: 'מעל מיליארד דולר. "יום הפיצה" הפך לחג שנתי בעולם הקריפטו — כל 22/5.',
    highlight: 'מעל מיליארד $',
    source: 'BitcoinTalk archive',
    emoji: '🍕',
    image: IMG_PIZZA,
  },
  {
    id: 'dyk-crypto-winklevoss',
    category: 'crypto',
    teaser: 'התאומים ווינקלווס קיבלו $65M מפייסבוק בתביעה. כמה השקיעו בביטקוין ב-2013?',
    punch: '11 מיליון דולר — ב-$120 לביטקוין. ב-2017 הפכו למיליארדרים. לפעמים הסיפור לא נגמר בתביעה.',
    highlight: 'פי 90',
    source: 'Forbes 2017 · NYT',
    emoji: '👬',
    image: IMG_GOLD,
  },
  {
    id: 'dyk-crypto-vitalik',
    category: 'crypto',
    teaser: 'ויטליק בוטרין כתב את ה-whitepaper של Ethereum בגיל 19 (2013). מה היה שיא ההון שלו?',
    punch: '1.4 מיליארד דולר ב-2021. הראשון להפוך למיליארדר קריפטו בגיל 20 — ועדיין לובש את אותה חולצה סגולה.',
    highlight: '1.4 מיליארד $',
    source: 'Bloomberg Billionaires Index',
    emoji: '👨‍💻',
    image: IMG_GEMS,
  },
  {
    id: 'dyk-crypto-doge',
    category: 'crypto',
    teaser: 'Dogecoin נוצרה ב-2013 כבדיחה על מם של כלב. מה היה שיא שווי השוק?',
    punch: '85 מיליארד דולר במאי 2021 — אחרי ציוצי אילון מאסק. בדיחה שהפכה לשווי של ניסאן.',
    highlight: '85 מיליארד $',
    source: 'CoinMarketCap historical',
    emoji: '🐕',
  },
  {
    id: 'dyk-crypto-ftx',
    category: 'crypto',
    teaser: 'FTX — בורסת הקריפטו השנייה בעולם. כמה כסף של לקוחות "נעלם" בנובמבר 2022?',
    punch: '8 מיליארד דולר. Sam Bankman-Fried קיבל 25 שנות מאסר. אחת הקריסות הגדולות בהיסטוריית הכספים.',
    highlight: '8 מיליארד $',
    source: 'SDNY indictment 2023',
    emoji: '💸',
  },
];

/** Pick a random Did You Know item (optionally filtered by category). */
export function pickRandomDidYouKnow(
  seed: number,
  excludeIds: readonly string[] = [],
): DidYouKnowItem {
  const pool = DID_YOU_KNOW_ITEMS.filter((i) => !excludeIds.includes(i.id));
  const idx = seed % Math.max(pool.length, 1);
  return pool[idx] ?? DID_YOU_KNOW_ITEMS[0];
}
