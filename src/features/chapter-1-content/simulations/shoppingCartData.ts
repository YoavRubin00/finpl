import type { ShoppingItem, ShoppingCartConfig } from './shoppingCartTypes';

/* ------------------------------------------------------------------ */
/*  Shopping Items, Israeli supermarket items for the cart race game   */
/* ------------------------------------------------------------------ */

const shoppingItems: ShoppingItem[] = [
    // --- Essential items (מוצרים חיוניים) ---
    {
        id: 'ess-1',
        name: 'חלב',
        emoji: '🥛',
        price: 6,
        category: 'essential',
    },
    {
        id: 'ess-2',
        name: 'לחם',
        emoji: '🍞',
        price: 8,
        category: 'essential',
    },
    {
        id: 'ess-3',
        name: 'ביצים',
        emoji: '🥚',
        price: 12,
        category: 'essential',
    },
    {
        id: 'ess-4',
        name: 'ירקות טריים',
        emoji: '🥬',
        price: 15,
        category: 'essential',
    },
    {
        id: 'ess-5',
        name: 'פירות',
        emoji: '🍎',
        price: 18,
        category: 'essential',
    },
    {
        id: 'ess-6',
        name: 'גבינה לבנה',
        emoji: '🧀',
        price: 5,
        category: 'essential',
    },
    {
        id: 'ess-7',
        name: 'אורז',
        emoji: '🍚',
        price: 10,
        category: 'essential',
    },
    {
        id: 'ess-8',
        name: 'חזה עוף',
        emoji: '🍗',
        price: 35,
        category: 'essential',
    },

    // --- Trap items (מלכודות שיווקיות) ---
    {
        id: 'trap-1',
        name: 'שוקולד 1+1',
        emoji: '🍫',
        price: 25,
        category: 'trap',
        trapType: 'bogo',
        trapExplanation: 'מבצע 1+1 גורם לך לקנות כפול ממה שתכננת. המחיר הבודד מנופח כדי שה"מבצע" ייראה משתלם.',
    },
    {
        id: 'trap-2',
        name: 'מכשיר פונדו במבצע',
        emoji: '🫕',
        price: 49,
        category: 'trap',
        trapType: 'endcap',
        trapExplanation: 'מוצרים בקצה המדף (אנדקאפ) ממוקמים שם כי הספק שילם עליהם. הם לא באמת במבצע, הם שם כדי לתפוס את העין.',
    },
    {
        id: 'trap-3',
        name: 'חטיפים ליד הקופה',
        emoji: '🍬',
        price: 12,
        category: 'trap',
        trapType: 'endcap',
        trapExplanation: 'חטיפים ליד הקופה מנצלים את "עייפות ההחלטות", אחרי שעשית עשרות בחירות בסופר, קשה יותר לעמוד בפיתוי.',
    },
    {
        id: 'trap-4',
        name: 'חבילת חטיפים ענקית',
        emoji: '📦',
        price: 45,
        category: 'trap',
        trapType: 'oversized',
        trapExplanation: 'אריזות גדולות נראות משתלמות, אבל בפועל הרבה מהמוצר מתקלקל לפני שמספיקים לאכול. המחיר לקילו לא תמיד זול יותר.',
    },
    {
        id: 'trap-5',
        name: 'שמפו "פרימיום" במבצע',
        emoji: '🧴',
        price: 35,
        category: 'trap',
        trapType: 'decoy-pricing',
        trapExplanation: 'מוצר "פרימיום" מוצב ליד מוצר רגיל כדי שהרגיל ייראה זול. בפועל, שניהם יקרים יותר מהמותג הפרטי.',
    },
    {
        id: 'trap-6',
        name: 'גלידה 2 ב-30',
        emoji: '🍦',
        price: 30,
        category: 'trap',
        trapType: 'bogo',
        trapExplanation: 'מבצע "2 ב-30" מכריח אותך לקנות שני פריטים. אם רצית רק אחד, שילמת 30 במקום 15. זה לא באמת חיסכון.',
    },
    {
        id: 'trap-7',
        name: 'שתייה אנרגיה 1+1',
        emoji: '⚡',
        price: 20,
        category: 'trap',
        trapType: 'bogo',
        trapExplanation: 'משקאות אנרגיה ליד הכניסה מנצלים את הרעב והעייפות שלך כשאתה נכנס לסופר. 1+1 גורם לך לקנות מה שלא תכננת.',
    },
    {
        id: 'trap-8',
        name: 'נרות ריחניים "במבצע"',
        emoji: '🕯️',
        price: 28,
        category: 'trap',
        trapType: 'endcap',
        trapExplanation: 'מוצרים שלא ברשימה שלך ומוצגים באזורי "מבצעים", הם שם כי החנות מרוויחה מהם הכי הרבה, לא כי הם זולים.',
    },

    // --- Budget alternative items (חלופות חסכוניות) ---
    {
        id: 'alt-1',
        name: 'קורנפלקס מותג פרטי',
        emoji: '🥣',
        price: 8,
        category: 'budget-alternative',
    },
    {
        id: 'alt-2',
        name: 'קורנפלקס מותג יקר',
        emoji: '🥣',
        price: 22,
        category: 'budget-alternative',
    },
    {
        id: 'alt-3',
        name: 'סבון כלים מותג פרטי',
        emoji: '🧼',
        price: 5,
        category: 'budget-alternative',
    },
    {
        id: 'alt-4',
        name: 'סבון כלים מותג מוכר',
        emoji: '🧼',
        price: 15,
        category: 'budget-alternative',
    },
];

/* ------------------------------------------------------------------ */
/*  Game Configuration                                                 */
/* ------------------------------------------------------------------ */

/** Total essentials in the items array */
const ESSENTIAL_COUNT = shoppingItems.filter(
    (item) => item.category === 'essential',
).length;

export const shoppingCartConfig: ShoppingCartConfig = {
    budget: 200,
    items: shoppingItems,
    essentialCount: ESSENTIAL_COUNT,
};
