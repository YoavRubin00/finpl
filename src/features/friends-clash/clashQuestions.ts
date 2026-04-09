import type { ClashQuestion } from './types';

/** 10 financial quiz questions for Friends Clash */
export const CLASH_QUESTIONS: ClashQuestion[] = [
    {
        id: 'cq-1',
        question: 'מה הכלל הפיננסי הבסיסי ביותר?',
        options: ['הוצא כמה שאתה רוצה', 'הוצא פחות ממה שאתה מרוויח', 'אל תחסוך כלום', 'קח הלוואות תמיד'],
        correctAnswer: 1,
        difficulty: 'easy',
        xpReward: 10,
    },
    {
        id: 'cq-2',
        question: 'מהי ריבית דריבית?',
        options: ['ריבית על הקרן בלבד', 'ריבית על ריבית', 'ריבית קבועה', 'ריבית שלילית'],
        correctAnswer: 1,
        difficulty: 'easy',
        xpReward: 10,
    },
    {
        id: 'cq-3',
        question: 'מהו מדד S&P 500?',
        options: ['500 חברות אמריקאיות גדולות', '500 מניות רנדומליות', 'מדד בנקים', 'מדד נדל"ן'],
        correctAnswer: 0,
        difficulty: 'medium',
        xpReward: 15,
    },
    {
        id: 'cq-4',
        question: 'מהו כלל 50/30/20?',
        options: ['50% חיסכון, 30% הוצאות, 20% השקעות', '50% צרכים, 30% רצונות, 20% חיסכון', '50% שכירות, 30% אוכל, 20% בילויים', '50% מסים, 30% חיסכון, 20% הוצאות'],
        correctAnswer: 1,
        difficulty: 'easy',
        xpReward: 10,
    },
    {
        id: 'cq-5',
        question: 'מהו ETF?',
        options: ['קרן גידור', 'קרן נאמנות סגורה', 'קרן סל נסחרת בבורסה', 'ביטוח חיים'],
        correctAnswer: 2,
        difficulty: 'medium',
        xpReward: 15,
    },
    {
        id: 'cq-6',
        question: 'מהו אג"ח ממשלתי?',
        options: ['מניה בחברה ממשלתית', 'הלוואה שאתה נותן למדינה', 'חשבון חיסכון בבנק', 'קרן פנסיה'],
        correctAnswer: 1,
        difficulty: 'medium',
        xpReward: 15,
    },
    {
        id: 'cq-7',
        question: 'כמה זמן לוקח להכפיל כסף בריבית 7% ("כלל 72")?',
        options: ['5 שנים', '7 שנים', 'בערך 10 שנים', '15 שנים'],
        correctAnswer: 2,
        difficulty: 'hard',
        xpReward: 20,
    },
    {
        id: 'cq-8',
        question: 'מהי אינפלציה?',
        options: ['ירידה במחירים', 'עלייה כללית ברמת המחירים', 'עלייה בערך הכסף', 'ריבית גבוהה'],
        correctAnswer: 1,
        difficulty: 'easy',
        xpReward: 10,
    },
    {
        id: 'cq-9',
        question: 'מהי פיזור סיכונים (דיוורסיפיקציה)?',
        options: ['לשים את כל הכסף במניה אחת', 'לפזר השקעות בין נכסים שונים', 'למכור הכל בפאניקה', 'להשקיע רק במזומן'],
        correctAnswer: 1,
        difficulty: 'medium',
        xpReward: 15,
    },
    {
        id: 'cq-10',
        question: 'מהו קרן חירום?',
        options: ['כסף להשקעות ספקולטיביות', 'חיסכון של 3-6 חודשי הוצאות למקרה חירום', 'הלוואה מהבנק', 'ביטוח רכב'],
        correctAnswer: 1,
        difficulty: 'easy',
        xpReward: 10,
    },
];

/** Get N random questions for a clash round */
export function getClashRound(count: number = 5): ClashQuestion[] {
    // Fisher-Yates shuffle
    const shuffled = [...CLASH_QUESTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}
