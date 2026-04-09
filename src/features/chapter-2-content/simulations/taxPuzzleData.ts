/** Tax credit and character data for the "Tax Credit Puzzle" simulation (Module 2-11) */

import {
  TaxCredit,
  CharacterProfile,
  TaxPuzzleConfig,
} from './taxPuzzleTypes';

const taxCredits: TaxCredit[] = [
  {
    id: 'resident',
    name: 'תושב/ת ישראל',
    pointsValue: 2.25,
    eligibleFor: ['resident'],
    lottie: require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json'),
    description: 'תושב ישראל מקבל 2.25 נקודות אוטומטית',
  },
  {
    id: 'soldier',
    name: 'חייל/ת משוחרר/ת',
    pointsValue: 2,
    eligibleFor: ['soldier'],
    lottie: require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json'),
    description: '2 נקודות ל-36 חודשים מהשחרור',
  },
  {
    id: 'degree',
    name: 'תואר ראשון',
    pointsValue: 1,
    eligibleFor: ['degree'],
    lottie: require('../../../../assets/lottie/wired-flat-486-school-hover-pinch.json'),
    description: 'נקודה ל-12 חודשים מסיום הלימודים',
  },
  {
    id: 'peripheral',
    name: 'יישוב מוטב',
    pointsValue: 1.5,
    eligibleFor: ['peripheral'],
    lottie: require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json'),
    description: '1.5 נקודות למגורים באזור עדיפות',
  },
  {
    id: 'child',
    name: 'ילד מתחת ל-18',
    pointsValue: 2.5,
    eligibleFor: ['parent'],
    lottie: require('../../../../assets/lottie/wired-flat-436-love-care-hover-pinch.json'),
    description: '2.5 נקודות להורה לילד מתחת ל-18',
  },
  {
    id: 'disability',
    name: 'נכות',
    pointsValue: 2,
    eligibleFor: ['disability'],
    lottie: require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json'),
    description: 'נכות מוכרת שווה 2 נקודות',
  },
  {
    id: 'immigrant',
    name: 'עולה חדש/ה',
    pointsValue: 3,
    eligibleFor: ['immigrant'],
    lottie: require('../../../../assets/lottie/wired-flat-782-compass-hover-pinch.json'),
    description: '3 נקודות ל-18 חודשים מהעלייה',
  },
  {
    id: 'single-parent',
    name: 'חד הורי',
    pointsValue: 1,
    eligibleFor: ['single-parent'],
    lottie: require('../../../../assets/lottie/wired-flat-44-avatar-user-in-circle-hover-looking-around.json'),
    description: 'נקודת זיכוי אחת להורה יחיד/ה',
  },
  {
    id: 'commute',
    name: 'נסיעה לעבודה',
    pointsValue: 0.25,
    eligibleFor: ['commute'],
    lottie: require('../../../../assets/lottie/wired-flat-504-school-bus-hover-pinch.json'),
    description: 'נקודה חלקית על נסיעות בתחבורה ציבורית',
  },
  {
    id: 'donations',
    name: 'תרומות מוכרות',
    pointsValue: 0.5,
    eligibleFor: ['donations'],
    lottie: require('../../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json'),
    description: 'זיכוי של 35% מסכום פוטנציאלי שנתרם',
  },
];

const characters: CharacterProfile[] = [
  {
    name: 'נטע',
    age: 24,
    emoji: '👩‍💼',
    attributes: [
      'resident',
      'soldier',
      'degree',
      'peripheral',
      'commute',
    ],
    grossSalary: 8_000,
    description:
      'חיילת משוחררת מנתיבות, עם תואר ראשון. נוסעת באוטובוס.',
  },
  {
    name: 'אורי',
    age: 30,
    emoji: '👨‍👧',
    attributes: [
      'resident',
      'single-parent',
      'parent',
      'disability',
      'donations',
    ],
    grossSalary: 12_000,
    description:
      'הורה יחיד עם נכות מוכרת. תורם למוסדות מוכרים כל שנה.',
  },
  {
    name: 'דנה',
    age: 26,
    emoji: '👩‍🔬',
    attributes: ['resident', 'immigrant', 'degree', 'commute'],
    grossSalary: 15_000,
    description:
      'עולה מצרפת עם תואר. משתמשת בתחבורה ציבורית.',
  },
];

/** Hebrew labels for character attribute badges */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  resident: 'תושב/ת',
  soldier: 'חייל/ת מ.',
  degree: 'תואר רא.',
  peripheral: 'יישוב מוטב',
  commute: 'נסיעות',
  'single-parent': 'חד הורי',
  parent: 'הורה',
  disability: 'נכות',
  donations: 'תרומות',
  immigrant: 'עולה חדש/ה',
};

/**
 * Simplified Israeli progressive tax brackets (2024-approximate).
 * Returns monthly tax for a given monthly gross salary.
 */
export function calculateMonthlyTax(monthlyGross: number): number {
  const annualGross = monthlyGross * 12;

  const brackets: { limit: number; rate: number }[] = [
    { limit: 84_120, rate: 0.1 },
    { limit: 120_720, rate: 0.14 },
    { limit: 193_800, rate: 0.2 },
    { limit: 269_280, rate: 0.31 },
    { limit: 560_280, rate: 0.35 },
    { limit: 721_560, rate: 0.47 },
    { limit: Infinity, rate: 0.5 },
  ];

  let tax = 0;
  let prevLimit = 0;

  for (const bracket of brackets) {
    if (annualGross <= prevLimit) break;
    const taxableInBracket =
      Math.min(annualGross, bracket.limit) - prevLimit;
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }
    prevLimit = bracket.limit;
  }

  return Math.round(tax / 12);
}

export const taxPuzzleConfig: TaxPuzzleConfig = {
  characters,
  allCredits: taxCredits,
  pointValue: 242,
};
