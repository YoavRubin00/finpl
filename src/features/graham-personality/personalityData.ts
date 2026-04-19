/**
 * Graham Investor Personality Test, questions & profile definitions.
 * 8 questions, each with 3-4 options scored across 4 investor archetypes.
 * Score tuple: [defensive, enterprising, speculator, rational]
 */
import type { PersonalityQuestion, InvestorProfile, InvestorProfileId } from './personalityTypes';

/* ── Questions ── */

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 'q1',
    question: 'השוק נפל 20% בשבוע. מה התגובה הראשונה שלכם?',
    options: [
      { text: 'מוכרים הכל, לא מסתכנים', scores: [0, 0, 3, 0] },
      { text: 'לא עושים כלום, הכל יסתדר', scores: [3, 0, 0, 1] },
      { text: 'בודקים אם יש הזדמנויות לקנות', scores: [0, 3, 0, 1] },
      { text: 'קוראים חדשות בלי הפסקה', scores: [0, 0, 2, 1] },
    ],
  },
  {
    id: 'q2',
    question: 'כמה זמן אתם מוכנים להשקיע בניתוח חברה לפני שקונים?',
    options: [
      { text: '5 דקות, רואים גרף וקונים', scores: [0, 0, 3, 0] },
      { text: 'שעה-שעתיים, קוראים סקירות', scores: [0, 1, 0, 3] },
      { text: 'יום שלם, קוראים דוחות כספיים', scores: [0, 3, 0, 1] },
      { text: 'לא מנתחים, סומכים על מדדים', scores: [3, 0, 0, 1] },
    ],
  },
  {
    id: 'q3',
    question: 'חבר מספר לכם על ״מניה חמה״. מה אתם עושים?',
    options: [
      { text: 'קונים מיד', scores: [0, 0, 3, 0] },
      { text: 'בודקים קצת ואז מחליטים', scores: [0, 1, 0, 3] },
      { text: 'עושים ניתוח עצמאי מלא', scores: [0, 3, 0, 1] },
      { text: 'מתעלמים, לא סומכים על טיפים', scores: [3, 0, 0, 1] },
    ],
  },
  {
    id: 'q4',
    question: 'מהו יחס P/E שמתאים לכם?',
    options: [
      { text: 'לא יודעים מה זה P/E', scores: [0, 0, 3, 0] },
      { text: 'מתחת ל-15, מכפיל נמוך ובטוח', scores: [0, 3, 0, 1] },
      { text: 'לא משנה אם החברה צומחת מהר', scores: [0, 0, 2, 1] },
      { text: 'ממוצע של מדד, לא מחפשים חריגות', scores: [3, 0, 0, 1] },
    ],
  },
  {
    id: 'q5',
    question: 'איך אתם מרגישים כשמניה שלכם יורדת 15%?',
    options: [
      { text: 'פאניקה, מוכרים מיד', scores: [0, 0, 3, 0] },
      { text: 'קצת לחוצים אבל ממתינים', scores: [1, 0, 0, 3] },
      { text: 'בודקים אם הערך הפנימי השתנה', scores: [0, 3, 0, 1] },
      { text: 'לא בודקים, יש תוכנית לטווח ארוך', scores: [3, 0, 0, 1] },
    ],
  },
  {
    id: 'q6',
    question: 'מה הגישה שלכם לפיזור?',
    options: [
      { text: 'הכל במניה אחת שאנחנו מאמינים בה', scores: [0, 0, 3, 0] },
      { text: '50/50 מניות ואג״ח', scores: [3, 0, 0, 1] },
      { text: 'מרוכז ב-5-10 מניות ערך שניתחנו', scores: [0, 3, 0, 1] },
      { text: 'קרנות מדד מפוזרות', scores: [1, 0, 0, 3] },
    ],
  },
  {
    id: 'q7',
    question: 'כמה פעמים אתם בודקים את תיק ההשקעות?',
    options: [
      { text: 'כל שעה', scores: [0, 0, 3, 0] },
      { text: 'פעם ביום', scores: [0, 0, 1, 3] },
      { text: 'פעם בשבוע', scores: [0, 3, 0, 1] },
      { text: 'פעם בחודש או פחות', scores: [3, 0, 0, 1] },
    ],
  },
  {
    id: 'q8',
    question: 'מה הדבר הכי חשוב בהשקעה?',
    options: [
      { text: 'לעשות כסף מהר', scores: [0, 0, 3, 0] },
      { text: 'לא להפסיד', scores: [3, 0, 0, 1] },
      { text: 'למצוא ערך שהשוק מפספס', scores: [0, 3, 0, 1] },
      { text: 'לבנות תוכנית ולדבוק בה', scores: [1, 0, 0, 3] },
    ],
  },
];

export const TOTAL_QUESTIONS = PERSONALITY_QUESTIONS.length;

/* ── Investor Profiles ── */

export const INVESTOR_PROFILES: Record<InvestorProfileId, InvestorProfile> = {
  defensive: {
    id: 'defensive',
    title: 'המשקיע ההגנתי',
    subtitle: 'שומר על הכסף בחוכמה',
    description:
      'אתם מעדיפים שקט נפשי על פני תשואות מקסימליות. הגישה שלכם, קרנות מדד, פיזור רחב, והשקעה לטווח ארוך. גאה בכם!',
    emoji: '🛡️',
    advice:
      'הטיפ שלי: המשקיע ההגנתי שומר על חלוקה של 50/50 בין מניות לאג״ח, ומאזן מחדש פעם בשנה.',
    color: '#22d3ee',
  },
  enterprising: {
    id: 'enterprising',
    title: 'המשקיע היוזם',
    subtitle: 'צייד הערך האמיתי',
    description:
      'אתם מוכנים להשקיע זמן ומאמץ בניתוח מעמיק. מחפשים מניות ערך עם מרווח ביטחון, קוראים דוחות כספיים, ולא מפחדים ללכת נגד ההמון.',
    emoji: '🔍',
    advice:
      'הטיפ שלי: חפשו חברות עם מכפיל רווח נמוך מ-15, יחס חוב להון נמוך מ-1, ומרווח ביטחון של לפחות 30%.',
    color: '#a78bfa',
  },
  speculator: {
    id: 'speculator',
    title: 'הספקולנט',
    subtitle: 'מהמרים או משקיעים? בואו נבדוק',
    description:
      'נראה שאתם עדיין מגיבים לרגש ולא להיגיון. זה בסדר, רוב האנשים מתחילים ככה. הצעד הראשון הוא להבין את ההבדל בין השקעה להימור.',
    emoji: '🎰',
    advice:
      'הטיפ שלי: פעולת השקעה היא כזו שמבטיחה, על בסיס ניתוח, בטיחות הכסף ותשואה סבירה. כל דבר אחר הוא ספקולציה.',
    color: '#f59e0b',
  },
  rational: {
    id: 'rational',
    title: 'הרציונלי',
    subtitle: 'אינסטינקטים טובים, צריכים תוכנית',
    description:
      'יש לכם גישה מאוזנת ואינסטינקטים טובים. אתם לא נסחפים ולא קופאים. עם תוכנית ברורה ומשמעת, אתם יכולים להפוך למשקיעים מצוינים.',
    emoji: '🧠',
    advice:
      'הטיפ שלי: ההצלחה בהשקעות לא דורשת אינטליגנציה יוצאת דופן, היא דורשת משמעת יוצאת דופן.',
    color: '#3b82f6',
  },
};
