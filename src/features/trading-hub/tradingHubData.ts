import { TradableAsset } from './tradingHubTypes';

export const TRADABLE_ASSETS: TradableAsset[] = [
  // ── Magnificent 7 ──
  {
    id: 'AAPL',
    name: 'Apple',
    symbol: '🍎',
    type: 'stock',
    volatilityRating: 'medium',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'החברה שהמציאה את האייפון ושינתה את העולם. אחת החברות הכי שוות בהיסטוריה עם מערכת אקולוגית שאי אפשר לברוח ממנה.',
  },
  {
    id: 'MSFT',
    name: 'Microsoft',
    symbol: '🪟',
    type: 'stock',
    volatilityRating: 'medium',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'מאחורי Windows, Xbox ו-Azure. הימרו בענק על AI עם ההשקעה ב-OpenAI ועכשיו הם בכל מקום.',
  },
  {
    id: 'NVDA',
    name: 'NVIDIA',
    symbol: '🟢',
    type: 'stock',
    volatilityRating: 'extreme',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'החברה שמתדלקת את מהפכת ה-AI עם השבבים שלה. נכון ל-2024, אחת החברות החזקות בעולם.',
  },
  {
    id: 'GOOGL',
    name: 'Alphabet',
    symbol: '🔍',
    type: 'stock',
    volatilityRating: 'medium',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'החברה מאחורי Google, YouTube ו-Android. שולטת בחיפוש, בפרסום דיגיטלי ועכשיו גם רצה על AI.',
  },
  {
    id: 'AMZN',
    name: 'Amazon',
    symbol: '📦',
    type: 'stock',
    volatilityRating: 'medium',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'התחילו כחנות ספרים אונליין, היום שולטים באיקומרס ובענן (AWS). ג׳ף בזוס בנה אימפריה.',
  },
  {
    id: 'META',
    name: 'Meta',
    symbol: '👤',
    type: 'stock',
    volatilityRating: 'high',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'Facebook, Instagram, WhatsApp - הכל שלהם. מרק צוקרברג הימר על המטאוורס ועכשיו על AI.',
  },
  {
    id: 'TSLA',
    name: 'Tesla',
    symbol: '⚡',
    type: 'stock',
    volatilityRating: 'extreme',
    educationalTag: 'פרק 4, מניות',
    descriptionHebrew:
      'המניה הכי דרמטית בשוק. רכבים חשמליים, רובוטים, ואילון מאסק שלא מפסיק לצייץ.',
  },

  // ── Indices ──
  {
    id: 'SPY',
    name: 'S&P 500',
    symbol: '🇺🇸',
    type: 'index',
    volatilityRating: 'low',
    educationalTag: 'פרק 3, השקעות מדדים',
    descriptionHebrew:
      'מדד 500 החברות הגדולות בארה״ב. הדרך הקלאסית לעקוב אחרי הכלכלה האמריקאית כולה.',
  },
  {
    id: 'QQQ',
    name: 'Nasdaq 100',
    symbol: '💻',
    type: 'index',
    volatilityRating: 'medium',
    educationalTag: 'פרק 4, תעודות סל',
    descriptionHebrew:
      'מדד 100 חברות הטכנולוגיה הגדולות. אם את/ה מאמינ/ה בטק, זה המדד שלך.',
  },
  {
    id: 'TA125.TA',
    name: 'תל אביב 125',
    symbol: '🇮🇱',
    type: 'index',
    volatilityRating: 'medium',
    educationalTag: 'פרק 3, יציבות פיננסית',
    descriptionHebrew:
      'מדד הדגל של הבורסה בתל אביב. כולל את 125 החברות הגדולות בישראל - מהבנקים ועד חברות הייטק.',
  },

  // ── Commodities ──
  {
    id: 'XAU',
    name: 'Gold',
    symbol: '🥇',
    type: 'commodity',
    volatilityRating: 'low',
    educationalTag: 'פרק 3, גידור סיכונים',
    descriptionHebrew:
      'זהב - הנכס הבטוח של האנושות כבר אלפי שנים. כשהשוק קורס, כולם רצים לזהב.',
  },
  {
    id: 'XAG',
    name: 'Silver',
    symbol: '🥈',
    type: 'commodity',
    volatilityRating: 'high',
    educationalTag: 'פרק 3, גידור סיכונים',
    descriptionHebrew:
      'כסף - האח הקטן של הזהב, אבל גם משמש בתעשייה. יותר תנודתי ויותר מפתיע.',
  },

  // ── Crypto ──
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: '₿',
    type: 'crypto',
    volatilityRating: 'extreme',
    educationalTag: 'פרק 4, קריפטו',
    descriptionHebrew:
      'המטבע הדיגיטלי שהתחיל את המהפכה. מוגבל ל-21 מיליון יחידות. הזהב הדיגיטלי של דור ה-Z.',
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'Ξ',
    type: 'crypto',
    volatilityRating: 'extreme',
    educationalTag: 'פרק 4, קריפטו',
    descriptionHebrew:
      'לא רק מטבע - פלטפורמה שלמה לחוזים חכמים ו-DeFi. המחשב העולמי של הקריפטו.',
  },
];

export const ASSET_BY_ID = new Map(
  TRADABLE_ASSETS.map((asset) => [asset.id, asset]),
);
