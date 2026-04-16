import type { BullshitAd } from './types';

export const BULLSHIT_ADS: BullshitAd[] = [
  {
    id: 'bs-zero-interest',
    isBullshit: true,
    templateId: 'scam-neon',
    headline: 'הלוואה 0% ריבית!',
    subheadline: '50,000 ₪ לכל מטרה — אישור מיידי',
    badge: 'הצעה לזמן מוגבל',
    disclaimer: '*דמי טיפול 8%, עמלות שנתיות 350₪, ריבית אפקטיבית 14%',
    explanation: 'גם כשהריבית כתובה 0%, דמי הטיפול והעמלות מייצרים APR אפקטיבי של 14%+. 0% ריבית ≠ 0% עלות.',
  },
  {
    id: 'bs-crypto-2x',
    isBullshit: true,
    templateId: 'scam-crypto',
    headline: 'הכפל את כספך תוך 30 יום',
    subheadline: 'אסטרטגיית מסחר מוכחת',
    badge: 'מקומות מוגבלים!',
    disclaimer: 'תוצאות אישיות משתנות',
    explanation: 'אין דרך חוקית להבטיח הכפלת כסף ב-30 יום. הבטחות כאלה הן חתימה קלאסית של פונזי או הונאה.',
  },
  {
    id: 'bs-mlm-passive',
    isBullshit: true,
    templateId: 'scam-aspirational',
    headline: 'עצמאות כלכלית מהבית',
    subheadline: 'הצטרפו למשפחה שלנו של חברים מצליחים',
    badge: 'הזדמנות ייחודית',
    disclaimer: 'הרווחים תלויים במאמץ האישי',
    explanation: 'מחקרי FTC מראים ש-99% ממשתתפי MLM מפסידים כסף. הרווח האמיתי מגיע מגיוס חברים חדשים — לא ממוצר אמיתי.',
  },
  {
    id: 'bs-excel-algorithm',
    isBullshit: true,
    templateId: 'scam-tech',
    headline: 'האלגוריתם הסודי של וול סטריט',
    subheadline: 'מה שהבנקים לא רוצים שתדע',
    badge: 'גילוי חדש',
    disclaimer: 'גישה לקורס: 499₪',
    explanation: 'אם באמת היה אלגוריתם מנצח, הבנקים היו קונים אותו במיליוני דולרים. מכירה ב-499₪ — פשוט לא יתכן.',
  },
  {
    id: 'bs-tama-guaranteed',
    isBullshit: true,
    templateId: 'scam-realestate',
    headline: 'השקעת תמ"א — רווח מובטח 300%',
    subheadline: 'פרויקט חדש במרכז',
    badge: 'הזדמנות אחרונה!',
    disclaimer: 'ההשקעה כרוכה בסיכון',
    explanation: 'אין "רווח מובטח" בנדל"ן. פרויקטי תמ"א לעתים מתעכבים שנים או נתקעים. 300% מובטח = סימן אזהרה אדום.',
  },
  {
    id: 'bs-forex-signals',
    isBullshit: true,
    templateId: 'scam-tech',
    headline: 'איך הרווחתי מיליון בפורקס',
    subheadline: 'סדרת מאסטרים עם הסוחר הטוב בישראל',
    badge: 'הכשרה פרטנית',
    disclaimer: 'הצלחה אישית אינה מעידה',
    explanation: '90-95% מסוחרי פורקס יומי מפסידים כסף (FT research). הצלחה של אחד = אנקדוטה, לא אסטרטגיה.',
  },
  {
    id: 'bs-nft-insider',
    isBullshit: true,
    templateId: 'scam-crypto',
    headline: 'NFT בלעדי — פוטנציאל x50',
    subheadline: 'קבוצת VIP — גישה מוגבלת',
    badge: '24 שעות בלבד',
    disclaimer: 'ערך נכסים דיגיטליים תנודתי',
    explanation: '"פוטנציאל x50" הוא סיסמת pump & dump — יוצרים הייפ, מוכרים את האחזקות שלהם, עוזבים את הקונה עם אסימון חסר ערך.',
  },
  {
    id: 'bs-daytrading-nocourse',
    isBullshit: true,
    templateId: 'scam-neon',
    headline: 'הרוויחו 1,000₪ ביום בלי ידע!',
    subheadline: 'מסחר פשוט — 10 דקות ביום',
    badge: 'התחלה מיידית',
    disclaimer: 'תוצאות אינדיבידואליות',
    explanation: 'מחקר נאסד"ק: 95% מסוחרים יומיים מפסידים כסף. "בלי ידע" = סיסמת פיתוי. המציאות הפוכה לחלוטין.',
  },
  {
    id: 'lg-etf-sp500',
    isBullshit: false,
    templateId: 'legit-corporate',
    headline: 'S&P 500 ETF',
    subheadline: '10% תשואה נומינלית ממוצעת (100 שנה)',
    badge: 'מכשיר פיננסי מפוקח',
    disclaimer: '*תשואות עבר אינן ערובה לעתיד',
    explanation: 'פרסומת לגיטימית. המספר ההיסטורי אמיתי (תשואה ריאלית ~7% בניכוי אינפלציה). גילוי נאות ברור.',
  },
  {
    id: 'lg-bank-deposit',
    isBullshit: false,
    templateId: 'legit-corporate',
    headline: 'פיקדון שקלי',
    subheadline: '4.2% ריבית שנתית',
    badge: 'בפיקוח בנק ישראל',
    disclaimer: 'לתקופה של 12 חודשים — סגורה',
    explanation: 'פיקדון בנקאי — מכשיר חסכון בסיסי מפוקח. התנאים מפורטים מראש (ריבית, תקופה), בפיקוח בנק ישראל.',
  },
  {
    id: 'lg-pension-fund',
    isBullshit: false,
    templateId: 'legit-warm',
    headline: 'קרן השתלמות',
    subheadline: 'פטור ממס רווחי הון אחרי 6 שנים',
    badge: 'לפי חוק מס הכנסה',
    disclaimer: 'תשואות משתנות לפי מסלול השקעה',
    explanation: 'קרן השתלמות = הטבת מס חוקית (סעיף 9(16) לפקודת מס הכנסה). מוסדר במשרד האוצר.',
  },
  {
    id: 'lg-index-fund',
    isBullshit: false,
    templateId: 'legit-corporate',
    headline: 'קרן מחקה S&P 500',
    subheadline: 'דמי ניהול 0.3% בלבד',
    badge: 'קרן פסיבית',
    disclaimer: '*אין הבטחת תשואה. תלוי בביצועי המדד',
    explanation: 'קרן פסיבית עוקבת אחרי מדד. דמי ניהול נמוכים ושקופים, אידיאלי לחסכון לטווח ארוך.',
  },
  {
    id: 'lg-gov-bond',
    isBullshit: false,
    templateId: 'legit-corporate',
    headline: 'אג"ח ממשלתי צמוד',
    subheadline: 'ריבית 2.5% + הצמדה למדד',
    badge: 'ערבות מדינה',
    disclaimer: 'מחוייב לתקופה עד פדיון',
    explanation: 'אג"ח של מדינת ישראל — אפיק סולידי. הריבית צמודה למדד = הגנה מאינפלציה. סיכון נמוך ביותר.',
  },
  {
    id: 'lg-parent-pension',
    isBullshit: false,
    templateId: 'legit-warm',
    headline: 'הפקדה לפנסיית ההורים',
    subheadline: 'זיכוי מס 35% — סעיף 45א',
    badge: 'הטבת מס חוקית',
    disclaimer: 'תקרה שנתית מותנית בהכנסה',
    explanation: 'הטבת מס חוקית לפי סעיף 45א לפקודת מס הכנסה — הפקדה לקרן פנסיה של הורה מזכה בהחזר מס אמיתי.',
  },
  {
    id: 'lg-gemel-investment',
    isBullshit: false,
    templateId: 'legit-corporate',
    headline: 'קופת גמל להשקעה',
    subheadline: 'משיכה בגיל 60 — ללא מס רווחי הון',
    badge: 'אישור משרד האוצר',
    disclaimer: 'תקרה שנתית ₪76,449 (2025)',
    explanation: 'מסלול חסכון חוקי עם יתרונות מס ברורים. התקרה השנתית ותנאי המשיכה מוגדרים בחוק ושקופים.',
  },
];

export const BULLSHIT_ROUND_SIZE = 5;

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getTodayBullshitAds(): BullshitAd[] {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0);
  const bs = BULLSHIT_ADS.filter((ad) => ad.isBullshit);
  const legit = BULLSHIT_ADS.filter((ad) => !ad.isBullshit);
  const shuffledBs = seededShuffle(bs, seed);
  const shuffledLegit = seededShuffle(legit, seed + 7);
  const mixed: BullshitAd[] = [];
  const halfBs = Math.ceil(BULLSHIT_ROUND_SIZE / 2);
  const halfLegit = BULLSHIT_ROUND_SIZE - halfBs;
  for (let i = 0; i < halfBs; i++) mixed.push(shuffledBs[i % shuffledBs.length]);
  for (let i = 0; i < halfLegit; i++) mixed.push(shuffledLegit[i % shuffledLegit.length]);
  return seededShuffle(mixed, seed + 13);
}
