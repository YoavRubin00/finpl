import type { ImageSourcePropType } from 'react-native';
import type { HigherLowerScenario } from './types';

const BLOB_BASE = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/minigames/higher-lower';

const ILLUSTRATION_MATTRESS: ImageSourcePropType = { uri: `${BLOB_BASE}/hl-mattress-vs-sp500.webp` };
const ILLUSTRATION_EARLY_LATE: ImageSourcePropType = { uri: `${BLOB_BASE}/hl-early-vs-late-invest.webp` };
const ILLUSTRATION_CRYPTO_ETF: ImageSourcePropType = { uri: `${BLOB_BASE}/hl-crypto-vs-etf.webp` };

const SCAM_GRAD: [string, string] = ['#94a3b8', '#64748b'];
const COMFORT_GRAD: [string, string] = ['#1e3a8a', '#0f1e4a'];
const GROWTH_GRAD: [string, string] = ['#7c3aed', '#a855f7'];
const GOLD_GRAD: [string, string] = ['#d4a017', '#fbbf24'];
const DANGER_GRAD: [string, string] = ['#dc2626', '#991b1b'];
const NEUTRAL_GRAD: [string, string] = ['#0891b2', '#0e7490'];

export const HIGHER_LOWER_SCENARIOS: HigherLowerScenario[] = [
  {
    id: 'hl-mattress-vs-sp500',
    category: 'compound-interest',
    question: 'מה יביא יותר כסף אחרי 25 שנה?',
    illustration: ILLUSTRATION_MATTRESS,
    durationYears: 25,
    leftSide: {
      title: '1,000,000 ₪ במזרן',
      subtitle: 'נשאר במזרן. לא זז.',
      gradient: SCAM_GRAD,
      textColor: '#ffffff',
      finalValue: 1000000,
      finalValueLabel: '₪',
    },
    rightSide: {
      title: '2,000 ₪ בחודש ב-S&P 500',
      subtitle: '7% ריאלי, 25 שנה',
      gradient: GROWTH_GRAD,
      textColor: '#ffffff',
      finalValue: 1624000,
      finalValueLabel: '₪',
    },
    correctSide: 'right',
    explanation: '2,000 ₪ בחודש במדד S&P 500, 7% ריאלי בשנה — אחרי 25 שנה יש ביד 1.62M ₪. המיליון במזרן? נאכל מאינפלציה. ריבית דריבית עושה את העבודה בזמן שאתם ישנים.',
    punchline: 'הכסף חייב לעבוד, לא לנוח במזרן',
    glossaryKeys: ['compound-interest', 'inflation', 'real-vs-nominal'],
  },
  {
    id: 'hl-early-vs-late-invest',
    category: 'time-in-market',
    question: 'מי מגיע לפנסיה עם יותר בגיל 65?',
    illustration: ILLUSTRATION_EARLY_LATE,
    durationYears: 43,
    leftSide: {
      title: 'יוסי: 10 שנים, מגיל 22',
      subtitle: '2,000 ₪/חודש. עצר בגיל 32.',
      gradient: GROWTH_GRAD,
      textColor: '#ffffff',
      finalValue: 3092000,
      finalValueLabel: '₪',
    },
    rightSide: {
      title: 'משה: 33 שנים, מגיל 32',
      subtitle: '2,000 ₪/חודש. לא עצר עד 65.',
      gradient: NEUTRAL_GRAD,
      textColor: '#ffffff',
      finalValue: 2854000,
      finalValueLabel: '₪',
    },
    correctSide: 'left',
    explanation: 'יוסי שם 240K ₪ בסך הכל. משה שם 792K ₪ — שלוש פעמים יותר. ובכל זאת יוסי מנצח עם 3.1M לעומת 2.85M. למה? הכסף שלו צמח 33 שנה יותר. הזמן בשוק > כמות הכסף שהכנסתם.',
    punchline: 'זמן מנצח סכום. כל שנה של דחייה עולה ביוקר',
    glossaryKeys: ['compound-interest', 'exponential'],
  },
  {
    id: 'hl-crypto-vs-etf',
    category: 'diversification',
    question: 'איזה תיק מתאים לפנסיה של 30 שנה?',
    illustration: ILLUSTRATION_CRYPTO_ETF,
    durationYears: 30,
    leftSide: {
      title: '100K על 3 מטבעות קריפטו',
      subtitle: 'יכול לעוף. גם ליפול ב-95%.',
      gradient: DANGER_GRAD,
      textColor: '#ffffff',
      finalValue: 0,
      finalValueLabel: '₪ (תלוי בתרחיש)',
    },
    rightSide: {
      title: '100K ב-ETF מדד עולמי',
      subtitle: '7% ריאלי, דמי ניהול 0.3%',
      gradient: COMFORT_GRAD,
      textColor: '#ffffff',
      finalValue: 761000,
      finalValueLabel: '₪',
    },
    correctSide: 'right',
    explanation: 'ETF מפוזר ב-7% ריאלי הופך 100K ל-761K תוך 30 שנה — סטטיסטית די ודאי. תיק של 3 מטבעות קריפטו? תנודתיות של 70%+. יכול לעלות פי 40, יכול להתמוסס ב-95%. לפנסיה בוחרים ודאות, לא הימור.',
    punchline: 'פיזור = חוסן. ריכוז = הימור',
    glossaryKeys: ['etf', 'inflation'],
  },
  {
    id: 'hl-pay-debt-vs-invest',
    category: 'debt-vs-invest',
    question: 'יש לכם 50K מזומן ו-50K חוב באשראי. מה חכם?',
    durationYears: 5,
    leftSide: {
      title: 'לפרוע את החוב',
      subtitle: 'אשראי ב-14% APR',
      gradient: GROWTH_GRAD,
      textColor: '#ffffff',
      finalValue: 46200,
      finalValueLabel: '₪ חיסכון בריבית',
    },
    rightSide: {
      title: 'להשקיע ב-ETF',
      subtitle: 'תשואה ריאלית ~7%',
      gradient: NEUTRAL_GRAD,
      textColor: '#ffffff',
      finalValue: 20100,
      finalValueLabel: '₪ רווח',
    },
    correctSide: 'left',
    explanation: 'חוב אשראי ב-14% = מפסידים 14% בשנה, מובטח. פירעון חוסך 46K בריבית ב-5 שנים. השקעה ב-7% תרוויח רק 20K. המתמטיקה פשוטה: חוב 14% > השקעה 7%. תמיד תפרעו חוב יקר לפני שתשקיעו.',
    punchline: 'חוב אשראי = תשואה שלילית של 14%',
    glossaryKeys: ['apr', 'etf', 'real-vs-nominal'],
  },
  {
    id: 'hl-active-vs-passive',
    category: 'fees-drag',
    question: '100K ל-30 שנה. איפה תצאו עם יותר?',
    durationYears: 30,
    leftSide: {
      title: 'קרן נאמנות אקטיבית',
      subtitle: '10% ברוטו, 2% דמי ניהול',
      gradient: DANGER_GRAD,
      textColor: '#ffffff',
      finalValue: 1006000,
      finalValueLabel: '₪',
    },
    rightSide: {
      title: 'קרן סל מחקה S&P 500',
      subtitle: '10% ברוטו, 0.1% דמי ניהול',
      gradient: GROWTH_GRAD,
      textColor: '#ffffff',
      finalValue: 1707000,
      finalValueLabel: '₪',
    },
    correctSide: 'right',
    explanation: 'דמי ניהול של 2% מול 0.1% נשמעים כלום. אבל אחרי 30 שנה ההפרש הוא 700K ₪. דמי ניהול שוחקים ריבית דריבית באקספוננציאליות. מחקרי SPIVA מראים ש-85% מהקרנות האקטיביות לא מכות את המדד לטווח ארוך. אז למה לשלם יותר?',
    punchline: 'כל אחוז דמי ניהול = עשרות אחוזי הפסד על 30 שנה',
    glossaryKeys: ['exponential', 'compound-interest', 'etf'],
  },
  {
    id: 'hl-employer-match',
    category: 'tax-shelter',
    question: 'אתם מפקידים 1,000 ₪/חודש. מעסיק מכפיל עד 6%. 30 שנה.',
    durationYears: 30,
    leftSide: {
      title: 'בלי התאמת מעסיק',
      subtitle: 'רק ההפקדה שלכם',
      gradient: NEUTRAL_GRAD,
      textColor: '#ffffff',
      finalValue: 1133000,
      finalValueLabel: '₪',
    },
    rightSide: {
      title: 'עם התאמת מעסיק 100%',
      subtitle: 'מעסיק מכפיל כל שקל',
      gradient: GOLD_GRAD,
      textColor: '#0f1e4a',
      finalValue: 2267000,
      finalValueLabel: '₪',
    },
    correctSide: 'right',
    explanation: 'התאמת מעסיק = 100% תשואה מיידית על כל שקל שלכם. לא לקחת את זה? זה כמו לזרוק כסף חינם. אחרי 30 שנה ב-7% — ההפרש הוא 1.13M ₪. בהבנת חוק, בדרך כלל כדאי לנצל את ההטבה במלואה.',
    punchline: 'התאמת מעסיק = כסף חינם. תמיד תקחו',
    glossaryKeys: ['compound-interest', 'pension-fund'],
  },
  {
    id: 'hl-rent-vs-buy',
    category: 'compound-interest',
    question: '25 שנה בתל אביב: מה חכם יותר?',
    durationYears: 25,
    leftSide: {
      title: 'לקנות דירה 2.5M',
      subtitle: 'משכנתא 2M, 4.5%, 25 שנה',
      gradient: GROWTH_GRAD,
      textColor: '#ffffff',
      finalValue: 4500000,
      finalValueLabel: '₪ שווי',
    },
    rightSide: {
      title: 'לשכור + להשקיע את ההפרש',
      subtitle: '7,500 שכ"ד + 4,500 ל-S&P',
      gradient: NEUTRAL_GRAD,
      textColor: '#ffffff',
      finalValue: 3400000,
      finalValueLabel: '₪ בתיק',
    },
    correctSide: 'left',
    explanation: 'בתל אביב עליית ערך היסטורית של 4-5% בשנה + קיצור החוב = בעל הדירה מחזיק ב-4.5M. השוכר שהשקיע את ההפרש מגיע ל-3.4M. אבל חשוב: זה מבוסס על ההיסטוריה — אין ערובה שהעבר יחזור, ובערים אחרות בעולם התשובה לפעמים הפוכה.',
    punchline: 'נדל"ן בישראל היסטורית חזק — אך לא ערובה',
    glossaryKeys: ['compound-interest', 'inflation'],
  },
  {
    id: 'hl-gemel-vs-savings',
    category: 'tax-shelter',
    question: '20 שנות חיסכון — איפה יותר משתלם?',
    durationYears: 20,
    leftSide: {
      title: 'חיסכון בבנק',
      subtitle: '3% נומינלי · ממוסה',
      gradient: SCAM_GRAD,
      textColor: '#ffffff',
      finalValue: 2060000,
      finalValueLabel: '₪ נטו',
    },
    rightSide: {
      title: 'קופת גמל להשקעה מנייתי',
      subtitle: '7% ריאלי · פטור בגיל 60',
      gradient: GOLD_GRAD,
      textColor: '#0f1e4a',
      finalValue: 3320000,
      finalValueLabel: '₪ נטו',
    },
    correctSide: 'right',
    explanation: 'חיסכון בבנק ממוסה על רווחים (15% שקלי / 25% צמוד) — תמיד. קופת גמל להשקעה במסלול מנייתי? פטורה ממס רווחי הון אם מושכים בגיל 60+ כקצבה. ב-20 שנה עם 76K לשנה, ההפרש מגיע ל-1.26M ₪. ההטבה המיסויית + ריבית דריבית = שילוב מנצח.',
    punchline: 'הטבות מס + ריבית דריבית = סופר-כוח',
    glossaryKeys: ['gemel-investment', 'equity-track', 'compound-interest'],
  },
];

export function getRandomScenario(date: string, playsToday: number): HigherLowerScenario {
  const seed = date.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0) + playsToday * 7;
  return HIGHER_LOWER_SCENARIOS[seed % HIGHER_LOWER_SCENARIOS.length];
}
