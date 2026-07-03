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

  // ── Community-reflection questions (Yoav 2026-07-03) — the same "what would
  //    you do / who wins long-term" prompts he runs in the WhatsApp community,
  //    adapted to the 2-option crowd format. These are OPINION questions: their
  //    topics carry no live-market label, so they never auto-resolve — the card
  //    just gathers the community's take and shows it honestly ("עדיין אוספים
  //    הצבעות"), never a fabricated majority. baselinePct is a neutral 50/50
  //    (nothing invented) and is not displayed as crowd sentiment.
  {
    id: 'cq-index-vs-stocks-longterm',
    text: 'מי ינצח לטווח ארוך: מדד רחב או בחירת מניות ספציפיות?',
    termExplanation: {
      title: 'מדד מול בחירת מניות',
      body: 'מדד רחב (כמו S&P 500) קונה נתח קטן מהרבה חברות בבת אחת — פיזור מקסימלי, בלי לבחור מנצחות. בחירת מניות ספציפיות יכולה לתת יותר אם צדקתם, אבל גם סיכון גדול יותר אם טעיתם. רוב המשקיעים המקצועיים לא מנצחים את המדד הרחב לאורך זמן — בדיוק השאלה למחשבה.',
    },
    options: [
      { id: 'a', label: 'מדד רחב', emoji: '📊', sentiment: 'yes' },
      { id: 'b', label: 'מניות ספציפיות', emoji: '🎯', sentiment: 'no' },
    ],
    baselinePct: [50, 50],
    baselineN: 1990,
    tags: {
      timing: 'evergreen',
      topic: 'sp500',
    },
  },
  {
    id: 'cq-stocks-vs-deposit-year',
    text: 'מי יעשה לכם יותר תשואה השנה: שוק המניות או פיקדון בבנק?',
    options: [
      { id: 'a', label: 'שוק המניות', emoji: '📈', sentiment: 'yes' },
      { id: 'b', label: 'פיקדון בבנק', emoji: '🏦', sentiment: 'no' },
    ],
    baselinePct: [50, 50],
    baselineN: 1760,
    tags: {
      timing: 'evergreen',
      topic: 'macro',
    },
  },
  {
    id: 'cq-diversify-currency',
    text: 'עדיף לפזר בין דולר לשקל, מאשר להחזיק רק מטבע אחד?',
    termExplanation: {
      title: 'למה לפזר מטבעות?',
      body: 'כשכל הכסף בשקל, ירידה של השקל מול הדולר מוחקת כוח קנייה על מוצרים מיובאים. כשהכל בדולר — ההפך. פיזור בין השניים מקטין את התלות בתנועה של מטבע בודד. בחצי השנה האחרונה הדולר ירד כ-6% מול השקל — מי שפיזר הרגיש את זה פחות.',
    },
    options: [
      { id: 'a', label: 'כן, לפזר', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא, מטבע אחד', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [50, 50],
    baselineN: 1680,
    tags: {
      timing: 'evergreen',
      topic: 'usd_ils',
    },
  },
  {
    id: 'cq-sell-or-hold-10pct',
    text: 'מנייה שקניתם קפצה 10% ביום. מוכרים עכשיו או מחזיקים?',
    options: [
      { id: 'a', label: 'מוכר, לוקח רווח', emoji: '💰', sentiment: 'yes' },
      { id: 'b', label: 'מחזיק לטווח ארוך', emoji: '💎', sentiment: 'no' },
    ],
    baselinePct: [50, 50],
    baselineN: 1850,
    tags: {
      timing: 'evergreen',
      topic: 'earnings',
    },
  },
];