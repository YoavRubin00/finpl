import type { PurchaseScenario, SnowballGameConfig } from './snowballTypes';

/* ------------------------------------------------------------------ */
/*  5 Purchase Scenarios, Israeli Gen-Z credit decisions               */
/* ------------------------------------------------------------------ */

const scenarios: PurchaseScenario[] = [
    {
        id: 'sb-1',
        item: 'לפטופ חדש לעבודה',
        emoji: '💻',
        price: 4000,
        description: 'הלפטופ הישן גוסס. בלי מחשב אין עבודה.',
        options: [
            {
                id: 'sb-1-a',
                label: 'תשלום מלא, ₪4,000',
                method: 'full',
                monthlyAmount: 4000,
                totalCost: 4000,
                feedback: '💪 כואב עכשיו, אבל אפס ריבית. הכסף יצא, אבל לא תשלם אגורה יותר.',
            },
            {
                id: 'sb-1-b',
                label: '10 תשלומים של ₪400',
                method: 'installments',
                monthlyAmount: 400,
                totalCost: 4000,
                feedback: '📊 תשלומים רגילים = אותו מחיר, רק פרוס. אין ריבית, אין בעיה.',
            },
            {
                id: 'sb-1-c',
                label: 'קרדיט, ₪200/חודש "נוח"',
                method: 'credit',
                monthlyAmount: 200,
                totalCost: 5280,
                feedback: '🔴 ₪200 נשמע נוח? עד שתסיים לשלם, הלפטופ יעלה לך ₪5,280. ריבית אוכלת אותך.',
            },
        ],
    },
    {
        id: 'sb-2',
        item: 'סופ"ש בצפון עם החבר\'ה',
        emoji: '🏕️',
        price: 1200,
        description: 'כולם נוסעים. "יאללה, תסגור!", FOMO קורא.',
        options: [
            {
                id: 'sb-2-a',
                label: 'תשלום מלא, ₪1,200',
                method: 'full',
                monthlyAmount: 1200,
                totalCost: 1200,
                feedback: '✅ שילמת ונגמר. אין חובות, אין ריבית. ההנאה שלך, בלי מחיר נוסף.',
            },
            {
                id: 'sb-2-b',
                label: '4 תשלומים של ₪300',
                method: 'installments',
                monthlyAmount: 300,
                totalCost: 1200,
                feedback: '📊 פריסה סבירה ל-4 חודשים. אותו מחיר, בלי ריבית.',
            },
            {
                id: 'sb-2-c',
                label: 'קרדיט, ₪100/חודש',
                method: 'credit',
                monthlyAmount: 100,
                totalCost: 1530,
                feedback: '🔴 סופ"ש ב-₪1,200 הפך ל-₪1,530. הריבית לא הולכת לחופש, היא הולכת לבנק.',
            },
        ],
    },
    {
        id: 'sb-3',
        item: 'טיפול שיניים דחוף',
        emoji: '🦷',
        price: 2500,
        description: 'כאב שלא נותן לישון. הרופא אומר: "אי אפשר לדחות."',
        options: [
            {
                id: 'sb-3-a',
                label: 'תשלום מלא, ₪2,500',
                method: 'full',
                monthlyAmount: 2500,
                totalCost: 2500,
                feedback: '💪 הוצאה הכרחית ששילמת במלואה. אפס ריבית, הכאב רק בשן.',
            },
            {
                id: 'sb-3-b',
                label: '5 תשלומים של ₪500',
                method: 'installments',
                monthlyAmount: 500,
                totalCost: 2500,
                feedback: '📊 רופאי שיניים בד"כ מאפשרים פריסה. אותו מחיר, יותר נשימה.',
            },
            {
                id: 'sb-3-c',
                label: 'קרדיט, ₪150/חודש',
                method: 'credit',
                monthlyAmount: 150,
                totalCost: 3400,
                feedback: '🔴 טיפול של ₪2,500 יעלה לך ₪3,400. הריבית לא מרדימה, היא כואבת.',
            },
        ],
    },
    {
        id: 'sb-4',
        item: 'טלפון חדש בבלאק פריידיי',
        emoji: '📱',
        price: 3200,
        description: '40% הנחה! "דיל כזה לא חוזר." הטלפון הנוכחי עובד, אבל ישן.',
        options: [
            {
                id: 'sb-4-a',
                label: 'תשלום מלא, ₪3,200',
                method: 'full',
                monthlyAmount: 3200,
                totalCost: 3200,
                feedback: '✅ אם באמת צריך, שילמת ונגמר. אבל האם באמת צריך?',
            },
            {
                id: 'sb-4-b',
                label: '12 תשלומים של ₪267',
                method: 'installments',
                monthlyAmount: 267,
                totalCost: 3200,
                feedback: '📊 פריסה ללא ריבית. אבל ₪267/חודש מצטרף לכל שאר ההתחייבויות.',
            },
            {
                id: 'sb-4-c',
                label: 'קרדיט, ₪180/חודש "קל"',
                method: 'credit',
                monthlyAmount: 180,
                totalCost: 4250,
                feedback: '🔴 "חסכת" ₪800 בבלאק פריידיי? הריבית הוסיפה ₪1,050. שילמת יותר מהמחיר המקורי.',
            },
        ],
    },
    {
        id: 'sb-5',
        item: 'חידוש ביטוח רכב',
        emoji: '🚗',
        price: 3600,
        description: 'הביטוח פג תוקף מחר. בלי ביטוח = בלי נסיעה.',
        options: [
            {
                id: 'sb-5-a',
                label: 'תשלום מלא, ₪3,600',
                method: 'full',
                monthlyAmount: 3600,
                totalCost: 3600,
                feedback: '💪 הוצאה הכרחית, שילמת במלואה. שום ריבית, שום כאב ראש.',
            },
            {
                id: 'sb-5-b',
                label: '6 תשלומים של ₪600',
                method: 'installments',
                monthlyAmount: 600,
                totalCost: 3600,
                feedback: '📊 חברות ביטוח מאפשרות פריסה ללא ריבית. פתרון חכם.',
            },
            {
                id: 'sb-5-c',
                label: 'קרדיט, ₪200/חודש',
                method: 'credit',
                monthlyAmount: 200,
                totalCost: 4750,
                feedback: '🔴 ביטוח ₪3,600 יעלה ₪4,750. שילמת ₪1,150 ריבית על משהו שחייב לשלם בכל מקרה.',
            },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Game Configuration                                                 */
/* ------------------------------------------------------------------ */

export const snowballConfig: SnowballGameConfig = {
    monthlySalary: 8000,
    minimumPaymentPercent: 0.05,
    creditInterestRate: 0.015, // 1.5%/month ≈ 18%/year
    scenarios,
};
