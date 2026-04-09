/** Fee attack and defense data for the "Bank Fee Combat" simulation (Module 1-7) */

import { BankCombatConfig, FeeAttackRound } from './bankCombatTypes';

const bankCombatRounds: FeeAttackRound[] = [
  {
    attack: {
      id: 'fee-account-mgmt',
      feeName: 'דמי ניהול חשבון',
      feeAmount: 25,
      lottieKey: 'bank',
      description: 'הבנק גובה ממך ₪25 מדי חודש רק על עצם קיום החשבון – סכום שמצטבר למאות שקלים בשנה.',
    },
    defenses: [
      {
        id: 'def-1a',
        label: 'לאיים לעבור בנק',
        effectiveness: 90,
        counterText: 'מצוין! האיום לעבור לרוב מבטל מיד את דמי הניהול.',
      },
      {
        id: 'def-1b',
        label: 'לבקש הנחה',
        effectiveness: 60,
        counterText: 'משא ומתן עוזר, אך איום ממשי היה משיג ביטול מוחלט.',
      },
      {
        id: 'def-1c',
        label: 'לקבל את זה',
        effectiveness: 0,
        counterText: 'שילמת ₪300 בשנה על כלום. תמיד כדאי להתמקח.',
      },
    ],
  },
  {
    attack: {
      id: 'fee-transactions',
      feeName: 'עמלת פעולות',
      feeAmount: 5,
      lottieKey: 'money',
      description: 'כל פעולה כדוגמת משיכה או הפקדה עולה ₪5. רבות כאלו יצטברו לסכום משמעותי.',
    },
    defenses: [
      {
        id: 'def-2a',
        label: 'מעבר לחשבון דיגיטלי',
        effectiveness: 90,
        counterText: 'מעולה! חשבון דיגיטלי לרוב פוטר אותך ממרבית העמלות הללו.',
      },
      {
        id: 'def-2b',
        label: 'הצטרפות למסלול פעולות',
        effectiveness: 60,
        counterText: 'מסלול מוזל עוזר, אבל ניהול דיגיטלי היה חוסך אפילו יותר.',
      },
      {
        id: 'def-2c',
        label: 'להמשיך לשלם כרגיל',
        effectiveness: 0,
        counterText: 'הפעולות המצטברות עולות לך מאות שקלים סתם. כדאי להתייעל.',
      },
    ],
  },
  {
    attack: {
      id: 'fee-credit-alloc',
      feeName: 'הקצאת אשראי',
      feeAmount: 150,
      lottieKey: 'card',
      description: 'עמלה שנתית על עצם החזקת מסגרת אשראי בחשבון, גם אם מעולם לא חרגת אליה.',
    },
    defenses: [
      {
        id: 'def-3a',
        label: 'לאיים בביטול המסגרת',
        effectiveness: 90,
        counterText: 'עבד! הבנק העדיף לבטל את העמלה מאשר לאבד את מסגרת האשראי שלך.',
      },
      {
        id: 'def-3b',
        label: 'לבקש הפחתה',
        effectiveness: 60,
        counterText: 'העמלה הופחתה. להבא, דע שאפשר גם לדרוש פטור מלא.',
      },
      {
        id: 'def-3c',
        label: 'להתעלם ולשלם',
        effectiveness: 0,
        counterText: 'שילמת עמלה על שירות שאולי אינך מנצל. חבל שלא ניסית לבטל.',
      },
    ],
  },
  {
    attack: {
      id: 'fee-teller',
      feeName: 'עמלת פקיד',
      feeAmount: 10,
      lottieKey: 'bank',
      description: 'כל פנייה לפקיד פנים-אל-פנים גוררת חיוב מיותר של ₪10.',
    },
    defenses: [
      {
        id: 'def-4a',
        label: 'שימוש באפליקציה',
        effectiveness: 90,
        counterText: 'פעולות בדיגיטל הן חינמיות ומהירות הרבה יותר.',
      },
      {
        id: 'def-4b',
        label: 'פנייה בטלפון',
        effectiveness: 60,
        counterText: 'עדיף מביקור, אבל עדיין לעתים יקר יותר מפעולה עצמאית.',
      },
      {
        id: 'def-4c',
        label: 'עבודה מול הפקיד',
        effectiveness: 0,
        counterText: 'שילמת שוב על שירות שאפשר לבצע בחינם מהסמארטפון.',
      },
    ],
  },
  {
    attack: {
      id: 'fee-credit-card',
      feeName: 'דמי כרטיס',
      feeAmount: 15,
      lottieKey: 'card',
      description: 'תשלום קבוע מדי חודש על עצם החזקת כרטיס האשראי הבנקאי שלך.',
    },
    defenses: [
      {
        id: 'def-5a',
        label: 'מעבר לכרטיס חינמי חוץ בנקאי',
        effectiveness: 90,
        counterText: 'נהדר! כרטיסים הניתנים בחינם שומרים על הכסף שלך אצלך.',
      },
      {
        id: 'def-5b',
        label: 'בקשת פטור לשנה מהבנק',
        effectiveness: 60,
        counterText: 'פטור זמני זה טוב, אך תצטרך לזכור לחדש אותו בשנה הבאה.',
      },
      {
        id: 'def-5c',
        label: 'להשלים עם העמלה',
        effectiveness: 0,
        counterText: 'הסכום אמנם קטן, אך בהצטברות שנתית מדובר בהוצאה מיותרת.',
      },
    ],
  },
  {
    attack: {
      id: 'fee-transfer',
      feeName: 'העברה בנקאית',
      feeAmount: 20,
      lottieKey: 'money',
      description: 'העברה בנקאית לחשבון אחר עולה ₪20, אפילו כשמדובר בסכום קטן.',
    },
    defenses: [
      {
        id: 'def-6a',
        label: 'שימוש באפליקציית תשלום',
        effectiveness: 90,
        counterText: 'גאוני! אפליקציות תשלום מעבירות כסף בחינם ובלחיצת כפתור.',
      },
      {
        id: 'def-6b',
        label: 'ניהול משא ומתן על חבילה',
        effectiveness: 60,
        counterText: 'חבילת העברות מוזלת עוזרת, אך במקרים רבים עדיף פשוט להעביר עצמאית בחינם.',
      },
      {
        id: 'def-6c',
        label: 'העברה כרגיל',
        effectiveness: 0,
        counterText: 'שילמת ₪20 סתם. יש חלופות חינמיות וקלות בהרבה.',
      },
    ],
  },
];

export const bankCombatConfig: BankCombatConfig = {
  playerHealth: 2000,
  rounds: bankCombatRounds,
};
