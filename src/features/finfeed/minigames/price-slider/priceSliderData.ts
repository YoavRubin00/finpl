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
    sharkExplanation: 'המחיר שילש את עצמו ב-27 שנה — לא כי הגרעינים השתפרו, אלא כי ה-₪ איבד 2/3 מכוח הקנייה שלו. זו אינפלציה — אויב שקט של הכסף שלכם.',
    category: 'food',
  },
  {
    id: 'ps-bus-ticket-1985',
    productName: 'כרטיס אוטובוס בודד',
    year: 1985,
    actualPriceILS: 0.35,
    currentPriceILS: 6.4,
    minGuess: 0.1,
    maxGuess: 10,
    unit: '₪',
    hint: 'לפני מטרופולינים, לפני רב־קו',
    sharkExplanation: 'פי 18 ב-40 שנה — ~7.5% אינפלציה ממוצעת. מה שלא מושקע ב-7%+ נשחק מהר יותר ממה שנראה.',
    category: 'transport',
  },
  {
    id: 'ps-3br-apt-ramat-gan-2010',
    productName: 'דירת 3 חדרים רמת־גן (ממוצע)',
    year: 2010,
    actualPriceILS: 1100000,
    currentPriceILS: 3200000,
    minGuess: 500000,
    maxGuess: 5000000,
    unit: '₪',
    hint: 'אותה דירה, 15 שנה אחרי',
    sharkExplanation: 'כמעט פי 3 ב-15 שנה — ~7.5% שנתי. זה מה שמייצרת בעלות על נכס במינוף במדינה עם ביקוש גבוה והיצע נמוך.',
    category: 'housing',
  },
  {
    id: 'ps-nokia-3310-2000',
    productName: 'נוקיה 3310 חדש בקופסה',
    year: 2000,
    actualPriceILS: 1190,
    currentPriceILS: 4500,
    minGuess: 200,
    maxGuess: 3000,
    unit: '₪',
    hint: 'הסמארטפון של האלפיים',
    sharkExplanation: 'המחיר הנומינלי נראה זול, אבל במונחי 2025 זה שווה כ-2,600₪ היום. טכנולוגיה זולה בזמן — שמרנות בקנייה משתלמת.',
    category: 'tech',
  },
  {
    id: 'ps-milk-carton-1995',
    productName: 'קרטון חלב 1 ליטר',
    year: 1995,
    actualPriceILS: 2.8,
    currentPriceILS: 7.3,
    minGuess: 0.5,
    maxGuess: 15,
    unit: '₪',
    hint: 'סופר רגיל, 1995',
    sharkExplanation: 'החלב עלה פי 2.6 ב-30 שנה. הגדלת החיסכון שלכם חייבת להדביק את האינפלציה — אחרת קונים פחות חלב עם אותה משכורת.',
    category: 'food',
  },
  {
    id: 'ps-falafel-1988',
    productName: 'פלאפל בפיתה',
    year: 1988,
    actualPriceILS: 2.5,
    currentPriceILS: 28,
    minGuess: 0.5,
    maxGuess: 50,
    unit: '₪',
    hint: 'פלאפל רחוב רגיל, סוף שנות ה-80',
    sharkExplanation: 'מחיר המנה התייקר פי 11 ב-37 שנה. זה כולל אינפלציה כללית וגם עליית ערך הפלאפל בהיררכיית "מותרות" של מזון רחוב.',
    category: 'food',
  },
  {
    id: 'ps-bitcoin-2013',
    productName: 'ביטקוין אחד',
    year: 2013,
    actualPriceILS: 450,
    currentPriceILS: 380000,
    minGuess: 50,
    maxGuess: 5000,
    unit: '₪',
    hint: '500 ₪ נראה סביר?',
    sharkExplanation: 'ביטקוין מ-450 ל-380,000 ב-12 שנה — פי 844. זו דוגמה קיצונית של נכס ספקולטיבי. רוב מי שקנה בראש גל — איבד. היסטוריה של מעטים מטושטשת את הסיכון של רוב.',
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
    sharkExplanation: 'הכרטיס עלה פי 3.7 ב-33 שנה — ~4% שנתי, פחות מהממוצע. זה בגלל שקולנוע מתחרה מול סטרימינג שלוחץ מחירים למטה.',
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
