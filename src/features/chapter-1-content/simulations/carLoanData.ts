import type { CarLoanScenario, CarLoanConfig } from './carLoanTypes';

/* ------------------------------------------------------------------ */
/*  Car Loan Scenarios — 8 rounds of financial decisions                */
/* ------------------------------------------------------------------ */

const carLoanScenarios: CarLoanScenario[] = [
    // Round 1: Buy new vs used
    {
        id: 'scenario-1',
        description: 'אתה רוצה לקנות רכב. יש לך אפשרות לקנות חדש מהסוכנות או משומש בן 3 שנים באותו דגם.',
        emoji: '🚗',
        options: [
            {
                id: 's1-new',
                label: 'רכב חדש מהסוכנות',
                monthlyPayment: 1_800,
                interestEffect: 'increase',
                feedback: 'רכב חדש מאבד 20% מערכו ברגע שיוצא מהסוכנות. ההלוואה גדולה יותר והריבית מצטברת.',
            },
            {
                id: 's1-used',
                label: 'רכב משומש בן 3 שנים',
                monthlyPayment: 1_200,
                interestEffect: 'decrease',
                feedback: 'בחירה חכמה! רכב משומש כבר עבר את הפחת הגדול. חוסך אלפי שקלים בריבית.',
            },
            {
                id: 's1-lease',
                label: 'ליסינג תפעולי',
                monthlyPayment: 1_500,
                interestEffect: 'neutral',
                feedback: 'ליסינג מונע סיכון פחת אבל אין לך נכס בסוף. אופציה סבירה.',
            },
        ],
    },
    // Round 2: Loan term length
    {
        id: 'scenario-2',
        description: 'הבנק מציע לך להאריך את תקופת ההלוואה כדי להוריד את התשלום החודשי. מה תעשה?',
        emoji: '📅',
        options: [
            {
                id: 's2-extend',
                label: 'האריך ל-7 שנים (תשלום נמוך)',
                monthlyPayment: 900,
                interestEffect: 'increase',
                feedback: 'תשלום חודשי נמוך, אבל סה"כ תשלם הרבה יותר ריבית. מלכודת קלאסית!',
            },
            {
                id: 's2-keep',
                label: 'השאר 4 שנים (תשלום בינוני)',
                monthlyPayment: 1_400,
                interestEffect: 'neutral',
                feedback: 'איזון סביר בין תשלום חודשי לעלות כוללת.',
            },
            {
                id: 's2-shorten',
                label: 'קצר ל-3 שנים (תשלום גבוה)',
                monthlyPayment: 1_900,
                interestEffect: 'decrease',
                feedback: 'מצוין! תשלום גבוה יותר אבל חוסך אלפים בריבית. הדרך החכמה ביותר.',
            },
        ],
    },
    // Round 3: Early repayment offer
    {
        id: 'scenario-3',
        description: 'קיבלת בונוס של ₪5,000 בעבודה. הבנק מציע לך לפרוע חלק מההלוואה מוקדם.',
        emoji: '💰',
        options: [
            {
                id: 's3-repay',
                label: 'פרע ₪5,000 מההלוואה',
                monthlyPayment: 1_200,
                interestEffect: 'decrease',
                feedback: 'פירעון מוקדם חוסך ריבית משמעותית! כל שקל שמחזירים מוקדם = פחות ריבית.',
            },
            {
                id: 's3-save',
                label: 'שמור בפיקדון ב-3%',
                monthlyPayment: 1_400,
                interestEffect: 'neutral',
                feedback: 'פיקדון ב-3% מרוויח פחות מהריבית שאתה משלם על ההלוואה (6%). עדיף לפרוע.',
            },
            {
                id: 's3-spend',
                label: 'שדרג את הרכב באביזרים',
                monthlyPayment: 1_400,
                interestEffect: 'increase',
                feedback: 'אביזרים לא מעלים את ערך הרכב. בזבזת את ההזדמנות לחסוך בריבית.',
            },
        ],
    },
    // Round 4: Interest rate hike
    {
        id: 'scenario-4',
        description: 'בנק ישראל העלה את הריבית במשק. ההלוואה שלך בריבית משתנה עולה ב-1.5%.',
        emoji: '📈',
        options: [
            {
                id: 's4-fix',
                label: 'קבע ריבית (עלות חד-פעמית)',
                monthlyPayment: 1_600,
                interestEffect: 'decrease',
                feedback: 'קיבוע ריבית מגן מפני עליות נוספות. תשלום קטן עכשיו חוסך הרבה בעתיד.',
            },
            {
                id: 's4-wait',
                label: 'חכה שהריבית תרד',
                monthlyPayment: 1_400,
                interestEffect: 'increase',
                feedback: 'הימור מסוכן. הריבית יכולה להמשיך לעלות ואתה משלם יותר כל חודש.',
            },
            {
                id: 's4-refinance',
                label: 'מחזר הלוואה בבנק אחר',
                monthlyPayment: 1_450,
                interestEffect: 'neutral',
                feedback: 'מיחזור יכול לעזור, אבל שים לב לעמלות יציאה ולתנאים החדשים.',
            },
        ],
    },
    // Round 5: Insurance choices
    {
        id: 'scenario-5',
        description: 'הביטוח השנתי של הרכב מתחדש. יש לך כמה אפשרויות.',
        emoji: '🛡️',
        options: [
            {
                id: 's5-full',
                label: 'ביטוח מקיף מלא (₪400/חודש)',
                monthlyPayment: 1_800,
                interestEffect: 'increase',
                feedback: 'ביטוח מקיף יקר מאוד. על רכב עם הלוואה, בדוק אם ביטוח צד ג\' מספיק.',
            },
            {
                id: 's5-compare',
                label: 'השווה מחירים ומצא זול יותר',
                monthlyPayment: 1_300,
                interestEffect: 'decrease',
                feedback: 'מעולה! השוואת מחירים יכולה לחסוך מאות שקלים בשנה. תמיד כדאי לבדוק.',
            },
            {
                id: 's5-third',
                label: 'ביטוח צד ג\' בלבד',
                monthlyPayment: 1_200,
                interestEffect: 'neutral',
                feedback: 'חיסכון בפרמיה, אבל סיכון גבוה יותר. על רכב עם הלוואה זה מסוכן.',
            },
        ],
    },
    // Round 6: Maintenance costs
    {
        id: 'scenario-6',
        description: 'הרכב צריך טיפול. המוסך המורשה דורש ₪2,500, מוסך עצמאי דורש ₪1,200.',
        emoji: '🔧',
        options: [
            {
                id: 's6-authorized',
                label: 'מוסך מורשה (₪2,500)',
                monthlyPayment: 1_600,
                interestEffect: 'increase',
                feedback: 'מוסך מורשה שומר על האחריות אבל יקר. בדוק אם האחריות עדיין בתוקף.',
            },
            {
                id: 's6-independent',
                label: 'מוסך עצמאי מומלץ (₪1,200)',
                monthlyPayment: 1_300,
                interestEffect: 'decrease',
                feedback: 'חיסכון חכם! מוסך עצמאי טוב נותן אותו שירות בחצי מחיר.',
            },
            {
                id: 's6-skip',
                label: 'דחה את הטיפול',
                monthlyPayment: 1_400,
                interestEffect: 'increase',
                feedback: 'דחיית טיפול גורמת לנזק גדול יותר בהמשך. חיסכון קצר טווח, הפסד ארוך טווח.',
            },
        ],
    },
    // Round 7: Refinance offer
    {
        id: 'scenario-7',
        description: 'חברת מימון מציעה לך למחזר את ההלוואה בריבית נמוכה יותר, אבל עם הארכת תקופה.',
        emoji: '🏦',
        options: [
            {
                id: 's7-refinance',
                label: 'מחזר בריבית נמוכה + הארכה',
                monthlyPayment: 1_000,
                interestEffect: 'increase',
                feedback: 'ריבית נמוכה יותר אבל תקופה ארוכה יותר = סה"כ ריבית גבוהה יותר. תמיד חשב סה"כ.',
            },
            {
                id: 's7-keep',
                label: 'השאר את ההלוואה הנוכחית',
                monthlyPayment: 1_400,
                interestEffect: 'neutral',
                feedback: 'לפעמים לא לעשות כלום זו ההחלטה הנכונה. תנאים קיימים לא תמיד גרועים.',
            },
            {
                id: 's7-extra',
                label: 'הוסף ₪200 לתשלום החודשי',
                monthlyPayment: 1_600,
                interestEffect: 'decrease',
                feedback: 'תוספת קטנה לתשלום החודשי מקצרת את ההלוואה ומפחיתה ריבית משמעותית!',
            },
        ],
    },
    // Round 8: Final assessment
    {
        id: 'scenario-8',
        description: 'החודש האחרון להלוואה מתקרב. יש לך הזדמנות אחרונה לפעול.',
        emoji: '🏁',
        options: [
            {
                id: 's8-payoff',
                label: 'פרע את היתרה במלואה',
                monthlyPayment: 2_000,
                interestEffect: 'decrease',
                feedback: 'סיום ההלוואה מוקדם! אין יותר ריבית. חופש פיננסי מהחוב הזה.',
            },
            {
                id: 's8-continue',
                label: 'המשך בתשלומים רגילים',
                monthlyPayment: 1_400,
                interestEffect: 'neutral',
                feedback: 'ממשיך לשלם ריבית עד הסוף. לא רע, אבל יכולת לחסוך.',
            },
            {
                id: 's8-newloan',
                label: 'קח הלוואה חדשה לרכב חדש',
                monthlyPayment: 1_800,
                interestEffect: 'increase',
                feedback: 'לקחת הלוואה חדשה לפני שסיימת את הקודמת? מלכודת חוב קלאסית!',
            },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Game Configuration                                                 */
/* ------------------------------------------------------------------ */

export const carLoanConfig: CarLoanConfig = {
    carValue: 80_000,
    loanAmount: 60_000,
    baseInterestRate: 0.06,
    months: 8,
    scenarios: carLoanScenarios,
};
