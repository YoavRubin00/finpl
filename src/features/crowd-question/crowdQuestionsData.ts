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
    text: 'ה-SPY יסיים את החודש בירוק?',
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
    id: 'cq-btc-above-100k',
    text: 'ביטקוין יחזיק מעל $100K בסוף השבוע?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [54, 46],
    baselineN: 2310,
    tags: {
      timing: 'weekly',
      topic: 'btc',
      triggers: { btcNear: 100000 },
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
    id: 'cq-usd-ils-3-70',
    text: 'הדולר יחצה 3.70 שקל בסוף החודש?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [37, 63],
    baselineN: 1720,
    tags: {
      timing: 'monthly',
      topic: 'usd_ils',
      triggers: { monthDay: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
    },
  },
  {
    id: 'cq-brent-above-80',
    text: 'ברנט יסגור את השבוע מעל $80?',
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
    id: 'cq-vix-above-20',
    text: 'מדד הפחד ייסגר מעל 20 בסוף השבוע?',
    options: [
      { id: 'a', label: 'כן', emoji: '✅', sentiment: 'yes' },
      { id: 'b', label: 'לא', emoji: '❌', sentiment: 'no' },
    ],
    baselinePct: [33, 67],
    baselineN: 1410,
    tags: {
      timing: 'weekly',
      topic: 'macro',
      triggers: { dayOfWeek: [4, 5], vixGt: 18 },
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