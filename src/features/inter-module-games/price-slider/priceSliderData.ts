import type { PriceSliderItem } from './types';

export const PRICE_SLIDER_ITEMS: PriceSliderItem[] = [
  {
    id: 'ps-sunflower-seeds-1998',
    productName: 'שקית גרעינים (250 גרם)',
    year: 1998,
    actualPriceILS: 4.9,
    currentPriceILS: 14.9,
    minGuess: 1,
    maxGuess: 25,
    unit: '₪',
    hint: 'זוכרים את הדוכן בקולנוע?',
    sharkExplanation: 'פי 3 ב-27 שנה. זו לא המזון שהתייקר, זה הכסף שאיבד 2/3 מכוחו.',
    category: 'food',
  },
  {
    id: 'ps-bus-ticket-1985',
    productName: 'כרטיס אוטובוס בודד',
    year: 1985,
    actualPriceILS: 0.35,
    currentPriceILS: 6.0,
    minGuess: 0.1,
    maxGuess: 10,
    unit: '₪',
    hint: 'לפני מטרופולינים, לפני רב־קו',
    sharkExplanation: 'פי 17 ב-40 שנה = 7% אינפלציה שנתית. חיסכון שלא מניב 7%+, פשוט נשחק.',
    category: 'transport',
  },
  {
    id: 'ps-3br-apt-ramat-gan-2010',
    productName: 'דירת 3 חדרים ברמת־גן (ממוצע)',
    questionVerb: 'עלתה',
    year: 2010,
    actualPriceILS: 1100000,
    currentPriceILS: 3200000,
    minGuess: 500000,
    maxGuess: 5000000,
    unit: '₪',
    hint: '',
    sharkExplanation: 'כמעט פי 3 ב-16 שנה = 7% שנתי. הכוח של נכס במינוף בשוק של היצע נמוך.',
    category: 'housing',
  },
  {
    id: 'ps-iphone-4-2010',
    productName: 'אייפון 4 (16GB) חדש בקופסה',
    year: 2010,
    actualPriceILS: 3500,
    currentPriceILS: 4900,
    minGuess: 1000,
    maxGuess: 6000,
    unit: '₪',
    hint: 'המכשיר שהפך את "סמארטפון" למילה יומיומית',
    sharkExplanation: '3,500₪ ב-2010 = 5,400₪ במונחי היום. אייפון 16 עולה 4,900₪, טכנולוגיה מנצחת אינפלציה.',
    category: 'tech',
  },
  {
    id: 'ps-ps5-2020',
    productName: 'PlayStation 5 השקה',
    year: 2020,
    actualPriceILS: 2200,
    currentPriceILS: 2400,
    minGuess: 1000,
    maxGuess: 4000,
    unit: '₪',
    hint: 'הקונסולה שחיכו לה שנה וחצי בגלל מחסור שבבים',
    sharkExplanation: 'יצאה ב-2,200₪, בשוק השחור ב-2022, 4,000₪+. מחסור היצע יכול להפוך מחיר לגמרי.',
    category: 'tech',
  },
  {
    id: 'ps-milk-carton-1995',
    productName: 'קרטון חלב 1 ליטר',
    year: 1995,
    actualPriceILS: 2.8,
    currentPriceILS: 7.0,
    minGuess: 0.5,
    maxGuess: 15,
    unit: '₪',
    hint: 'סופר רגיל, 1995 (מחיר מפוקח)',
    sharkExplanation: 'פי 2.5 ב-30 שנה, וזה מחיר מפוקח. חיסכון שלא צומח באינפלציה = פחות חלב בכל שנה.',
    category: 'food',
  },
  {
    id: 'ps-falafel-1988',
    productName: 'פלאפל בפיתה',
    year: 1988,
    actualPriceILS: 2.5,
    currentPriceILS: 22,
    minGuess: 0.5,
    maxGuess: 50,
    unit: '₪',
    hint: 'פלאפל רחוב רגיל, סוף שנות ה-80',
    sharkExplanation: 'פי 9 ב-37 שנה. גם אוכל רחוב מושפע מאינפלציה, ולפעמים הופך ל"מותרות קטן".',
    category: 'food',
  },
  {
    id: 'ps-bitcoin-2013',
    productName: 'ביטקוין אחד',
    year: 2013,
    actualPriceILS: 600,
    currentPriceILS: 360000,
    minGuess: 50,
    maxGuess: 5000,
    unit: '₪',
    hint: 'תחילת 2013, לפני הבום',
    sharkExplanation: 'פי 600 ב-12 שנה, אבל רוב מי שקנה בראש הגל ספג -70% לפני התאוששות. קיצוניות בשני הכיוונים.',
    category: 'finance',
  },
  {
    id: 'ps-cinema-ticket-1992',
    productName: 'כרטיס קולנוע (מבוגר, ערב)',
    year: 1992,
    actualPriceILS: 14,
    currentPriceILS: 52,
    minGuess: 3,
    maxGuess: 80,
    unit: '₪',
    hint: 'סרט בקולנוע מולטיפלקס',
    sharkExplanation: 'פי 3.7 ב-33 שנה = 4% שנתי בלבד. תחרות מול סטרימינג לוחצת מחירים למטה.',
    category: 'leisure',
  },
];

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

export function getRandomPriceItem(date: string, playsToday: number): PriceSliderItem {
  const seed = stringToSeed(date) + playsToday * 17;
  return PRICE_SLIDER_ITEMS[seed % PRICE_SLIDER_ITEMS.length];
}

export function computeAccuracy(guess: number, actual: number): number {
  if (actual === 0) return 0;
  const diff = Math.abs(guess - actual);
  const ratio = diff / actual;
  const raw = 1 - ratio;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}
