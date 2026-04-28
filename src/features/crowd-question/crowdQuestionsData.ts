import type { CrowdQuestion } from './types';

export const CROWD_QUESTIONS: readonly CrowdQuestion[] = [
  {
    id: 'cq-sp500-week-close',
    text: 'איך ה-S&P 500 ייסגר את השבוע?',
    options: [
      { id: 'a', label: 'ירוק', emoji: '🟢', sentiment: 'green' },
      { id: 'b', label: 'אדום', emoji: '🔴', sentiment: 'red' },
    ],
    baselinePct: [57, 43],
    baselineN: 1820,
    tags: {
      timing: 'weekly',
      topic: 'sp500',
      triggers: { dayOfWeek: [4, 5] },
    },
  },
  {
    id: 'cq-tlv35-sunday-open',
    text: 'איך ת"א-35 ייפתח השבוע?',
    options: [
      { id: 'a', label: 'ירוק', emoji: '🟢', sentiment: 'green' },
      { id: 'b', label: 'אדום', emoji: '🔴', sentiment: 'red' },
    ],
    baselinePct: [52, 48],
    baselineN: 1450,
    tags: {
      timing: 'weekly',
      topic: 'tlv35',
      triggers: { dayOfWeek: [0, 6] },
    },
  },
  {
    id: 'cq-spy-month-positive',
    text: 'ה-SNP 500 יסיים את החודש בירוק?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [61, 39],
    baselineN: 2080,
    tags: {
      timing: 'monthly',
      topic: 'sp500',
      triggers: { monthDay: [25, 26, 27, 28, 29, 30, 31] },
    },
  },
  {
    id: 'cq-btc-week-green',
    text: 'ביטקוין יסגור את השבוע ירוק?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [52, 48],
    baselineN: 2310,
    tags: {
      timing: 'weekly',
      topic: 'btc',
    },
  },
  {
    id: 'cq-btc-bounce-back',
    text: 'ביטקוין יחזור לרמה של לפני הירידה השבוע?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [47, 53],
    baselineN: 1640,
    tags: {
      timing: 'weekly',
      topic: 'btc',
    },
  },
  {
    id: 'cq-fed-rate-cut',
    text: 'הפד יוריד ריבית בישיבה הקרובה?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [44, 56],
    baselineN: 1980,
    tags: {
      timing: 'monthly',
      topic: 'rates',
      triggers: { monthDay: [10, 11, 12, 13, 14, 15, 16, 17, 18] },
    },
  },
  {
    id: 'cq-cpi-below-consensus',
    text: 'האינפלציה תפתיע כלפי מטה החודש?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [42, 58],
    baselineN: 1520,
    tags: {
      timing: 'monthly',
      topic: 'macro',
      triggers: { monthDay: [9, 10, 11, 12, 13, 14, 15] },
    },
  },
  {
    id: 'cq-nfp-beat',
    text: 'דוח התעסוקה ינצח את התחזיות?',
    termExplanation: {
      title: 'מה זה דוח התעסוקה?',
      body: 'דוח התעסוקה האמריקאי (NFP — Non-Farm Payrolls) מתפרסם בכל יום שישי הראשון בחודש ומודד כמה משרות חדשות נוספו במגזר הלא-חקלאי. הוא נחשב לאחד הנתונים החשובים בעולם — מזיז שווקים בשנייה. דוח חזק = כלכלה רותחת, טוב למניות אבל מקטין את הסיכוי להורדת ריבית. דוח חלש = להפך.',
    },
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [51, 49],
    baselineN: 1380,
    tags: {
      timing: 'monthly',
      topic: 'macro',
      triggers: { monthDay: [1, 2, 3, 4, 5, 6, 7], dayOfWeek: [5] },
    },
  },
  {
    id: 'cq-usd-ils-month-direction',
    text: 'הדולר יתחזק על חשבון השקל החודש?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [46, 54],
    baselineN: 1720,
    tags: {
      timing: 'monthly',
      topic: 'usd_ils',
      triggers: { monthDay: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
    },
  },
  {
    id: 'cq-brent-week-green',
    text: 'הנפט יסגור את השבוע גבוה מהפתיחה?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [41, 59],
    baselineN: 1290,
    tags: {
      timing: 'weekly',
      topic: 'oil',
      triggers: { dayOfWeek: [4, 5] },
    },
  },
  {
    id: 'cq-gold-new-ath',
    text: 'הזהב ישבור שיא חדש החודש?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [56, 44],
    baselineN: 1560,
    tags: {
      timing: 'monthly',
      topic: 'gold',
    },
  },
  {
    id: 'cq-nvda-aapl-eps-beat',
    text: 'אנבידיה ואפל יכו את התחזיות בדוחות הקרובים?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [68, 32],
    baselineN: 2150,
    tags: {
      timing: 'monthly',
      topic: 'earnings',
      triggers: { monthDay: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
    },
  },
  {
    id: 'cq-vix-week-up',
    text: 'מדד הפחד יעלה בסוף השבוע?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [38, 62],
    baselineN: 1410,
    tags: {
      timing: 'weekly',
      topic: 'macro',
      triggers: { dayOfWeek: [4, 5] },
    },
  },
  {
    id: 'cq-market-green-today',
    text: 'השוק ייסגר ירוק היום?',
    options: [
      { id: 'a', label: 'ירוק', emoji: '🟢', sentiment: 'green' },
      { id: 'b', label: 'אדום', emoji: '🔴', sentiment: 'red' },
    ],
    baselinePct: [54, 46],
    baselineN: 1870,
    tags: {
      timing: 'evergreen',
      topic: 'sp500',
    },
  },
];