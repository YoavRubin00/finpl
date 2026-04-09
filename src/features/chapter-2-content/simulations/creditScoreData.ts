/** Credit event data for the "Build Your Credit Score" simulation (Module 2-10) */

import { CreditEvent, CreditScoreConfig } from './creditScoreTypes';

const creditEvents: CreditEvent[] = [
  {
    id: 'bounced-check',
    senderName: 'בנק אוצרות',
    sourceType: 'bank',
    severity: 'critical',
    description: 'חסרים 200 ש"ח לשכירות שמחר יורדת, והמשכורת תיכנס רק ברביעי.',
    options: [
      {
        id: 'chk-ignore',
        label: 'לסמוך שזה פשוט יעבור',
        scoreImpact: -80,
        feedback: 'הצ\'ק חזר!',
        isCorrect: false,
        explanation: 'זה מרסק את האמינות שלך לשנים קדימה. אין דבר שחוזר על עצמו יותר גרוע מחזרת צ\'ק.',
      },
      {
        id: 'chk-loan',
        label: 'לקחת הלוואת גישור ל-3 ימים',
        scoreImpact: 15,
        feedback: 'מנעת אסון בזמן.',
        isCorrect: true,
        explanation: 'הלוואה זה לא מושלם, אבל מניעת חזרת תשלום קריטית יותר. ציון האשראי נשמר.',
      },
    ],
  },
  {
    id: 'utilization-trap',
    senderName: 'Max האשראי',
    sourceType: 'credit_card',
    severity: 'important',
    description: 'המסגרת שלך היא 10K, והטיסה לתאילנד עולה 9K בתשלום אחד.',
    options: [
      {
        id: 'util-max',
        label: 'לגהץ הכל במכה (ניצול 90%)',
        scoreImpact: -30,
        feedback: 'מזוהה מצוקת אשראי רגעית.',
        isCorrect: false,
        explanation: 'ניצול כמעט מלא של המסגרת משדר לבנק שאתה קצר בכסף. זה יפגע בדירוג שלך.',
      },
      {
        id: 'util-split',
        label: 'חצי באשראי, היתר בהעברה',
        scoreImpact: 25,
        feedback: 'חכם! נשארת מתחת ל-30% ניצול מסגרת.',
        isCorrect: true,
        explanation: 'פיצול משדר יציבות ושומר על אחוז ניצול (Utilization) נמוך ובריא.',
      },
    ],
  },
  {
    id: 'guarantor-danger',
    senderName: 'יונתן החבר',
    sourceType: 'whatsapp',
    severity: 'critical',
    description: 'אחי, שוכר דירה בת"א וצריך ערב לחוזה. תעשה ג\'סטה?',
    options: [
      {
        id: 'guar-accept',
        label: 'לחתום עיוור. בשביל חבר הכל.',
        scoreImpact: -40,
        feedback: 'החוב הפוטנציאלי שלו הפך לשלך.',
        isCorrect: false,
        explanation: 'ערבות מורידה מהמסגרת הכללית שלך, גם אם הוא ישלם פיקס.',
      },
      {
        id: 'guar-refuse',
        label: 'להתנצל ולא לחתום אישית',
        scoreImpact: 10,
        feedback: 'קשה חברתית, חכם כלכלית.',
        isCorrect: true,
        explanation: 'התיק שלך נשאר נקי בשביל המטרות שלך עצמך (כמו משכנתא).',
      },
    ],
  },
  {
    id: 'hard-inquiries',
    senderName: 'מערכת BDI',
    sourceType: 'bdi',
    severity: 'important',
    description: 'קיבלת הצעות מימון מ-5 חברות, וכולן רוצות להציץ בדוח שלך.',
    options: [
      {
        id: 'inq-all',
        label: 'לאשר לכולן בדיקה מקיפה',
        scoreImpact: -50,
        feedback: 'פאניקת אשראי! הדירוג התרסק.',
        isCorrect: false,
        explanation: 'ריבוי בקשות בדיקה (Hard Pull) משדר נואשות לחוב, ומעלה את הסיכון שלך.',
      },
      {
        id: 'inq-one',
        label: 'להפיק עותק עצמי ולהציג רק לאחת',
        scoreImpact: 10,
        feedback: 'בדיקה "רכה" לא פוגעת בציון.',
        isCorrect: true,
        explanation: 'שליפה עצמית (Soft Pull) לא מתועדת כבקשת חוב שפגעה בדירוג.',
      },
    ],
  },
  {
    id: 'thin-file-myth',
    senderName: 'אמא',
    sourceType: 'whatsapp',
    severity: 'routine',
    description: 'חוגר גזור! אני מציעה לחתוך את כרטיסי האשראי ולחיות רק על מזומן.',
    options: [
      {
        id: 'thin-agree',
        label: 'מסכים לגמרי. למנוע חובות בכל מחיר',
        scoreImpact: -20,
        feedback: 'הפכת לרוח רפאים (Thin File) במערכת.',
        isCorrect: false,
        explanation: 'בלי אשראי הבנק לא יוכל להעריך אותך. כשתצטרך משכנתא, לא יכירו אותך.',
      },
      {
        id: 'thin-disagree',
        label: 'לשמור כרטיס אחד לחיובים שוטפים',
        scoreImpact: 35,
        feedback: 'היסטוריה חיובית בונה את הציון שלך.',
        isCorrect: true,
        explanation: 'ניהול נכון של חיובים שוטפים מוכיח יציבות פיננסית לאורך זמן.',
      },
    ],
  },
];

export const creditScoreConfig: CreditScoreConfig = {
  startingScore: 650,
  events: creditEvents,
  totalRounds: 5,
};
