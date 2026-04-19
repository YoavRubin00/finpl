/** Emergency event data for the "Emergency Fund Trampoline" simulation (Module 1-9) */

import { EmergencyEvent, EmergencyFundConfig, SavingsChoice } from './emergencyFundTypes';

/** 6 emergency events that can occur during the 12-month game */
const emergencyEvents: EmergencyEvent[] = [
  {
    id: 'flat-tire',
    name: 'פנצ\'ר',
    emoji: '🚗',
    cost: 400,
    severity: 'minor',
  },
  {
    id: 'dental',
    name: 'טיפול שיניים',
    emoji: '🦷',
    cost: 2000,
    severity: 'major',
  },
  {
    id: 'boiler',
    name: 'תיקון דוד שמש',
    emoji: '☀️',
    cost: 1500,
    severity: 'major',
  },
  {
    id: 'phone-broken',
    name: 'מכשיר טלפון נשבר',
    emoji: '📱',
    cost: 800,
    severity: 'minor',
  },
  {
    id: 'layoff',
    name: 'פיטורים',
    emoji: '😰',
    cost: 0,
    severity: 'catastrophic',
  },
  {
    id: 'ac-broken',
    name: 'מזגן מתקלקל',
    emoji: '❄️',
    cost: 3000,
    severity: 'major',
  },
];

/**
 * Generates a randomized emergency schedule.
 * Layoff always occupies 2 consecutive months (7-8 or 8-9).
 * Other 5 events distributed across remaining even months.
 */
export function generateSchedule(): Record<number, string> {
  const nonLayoff = emergencyEvents.filter((e) => e.id !== 'layoff');
  // Fisher-Yates shuffle for non-layoff events
  const shuffled = [...nonLayoff];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Fisher-Yates shuffle for available slots: months 2,3,5,6,10,12
  const slots = [2, 3, 5, 6, 10, 12];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const schedule: Record<number, string> = {};
  // Place layoff at month 8 (affects 8+9)
  schedule[8] = 'layoff';
  // Place the 5 non-layoff events in random slots
  for (let i = 0; i < Math.min(shuffled.length, slots.length); i++) {
    schedule[slots[i]] = shuffled[i].id;
  }
  return schedule;
}

/** Savings choice options available each normal month */
export interface SavingsOption {
  /** Choice key */
  choice: SavingsChoice;
  /** Hebrew label */
  label: string;
  /** Emoji icon */
  emoji: string;
  /** What portion of disposable income (income - expenses) goes to savings */
  savingsRate: number;
  /** Hebrew description */
  description: string;
  /** Savings amount in ₪ for display */
  savingsAmount: number;
  /** Impact on happiness score (-2 to +2) */
  happinessImpact: number;
}

export const savingsOptions: SavingsOption[] = [
  {
    choice: 'save-more',
    savingsRate: 0.7,
    label: 'חיסכון מקסימלי',
    emoji: '🏦',
    description: 'מוותר על בילויים ומותרות. קשה, אבל הקרן גדלה מהר.',
    savingsAmount: 2100,
    happinessImpact: -2,
  },
  {
    choice: 'balanced',
    savingsRate: 0.4,
    label: 'מאוזן',
    emoji: '⚖️',
    description: 'חיים בנוחות עם חיסכון סביר. האיזון האידיאלי?',
    savingsAmount: 1200,
    happinessImpact: 0,
  },
  {
    choice: 'spend-more',
    savingsRate: 0.1,
    label: 'הנאה מהחיים',
    emoji: '🎉',
    description: 'יוצא לבלות, קונה מה שבא לך. אבל מה יקרה בהפתעה?',
    savingsAmount: 300,
    happinessImpact: 2,
  },
];

/** Happiness-triggered events, appear when happiness is high/low */
export interface HappinessEvent {
  minHappiness: number;
  maxHappiness: number;
  month: number;
  text: string;
  emoji: string;
  /** Bonus/penalty in ₪ (positive = bonus, negative = cost) */
  financialImpact: number;
}

export const happinessEvents: HappinessEvent[] = [
  // Month 2, low happiness penalty
  {
    minHappiness: 0,
    maxHappiness: 3,
    month: 2,
    text: 'ויתרת על יום הולדת של חבר... ההרגשה לא טובה.',
    emoji: '🎂',
    financialImpact: 0,
  },
  // Month 4, high happiness bonus
  {
    minHappiness: 7,
    maxHappiness: 10,
    month: 4,
    text: 'חבר הזמין אותך לאירוע, האופטימיות שלך משתלמת!',
    emoji: '🎉',
    financialImpact: 500,
  },
  // Month 5, low happiness cost
  {
    minHappiness: 0,
    maxHappiness: 2,
    month: 5,
    text: 'הלחץ מצטבר, קנית אוכל מוכן יקר כל השבוע.',
    emoji: '🍕',
    financialImpact: -400,
  },
  // Month 6, mid happiness reward
  {
    minHappiness: 5,
    maxHappiness: 8,
    month: 6,
    text: 'השכנה שמעה שאתה אחראי, הציעה לך עבודה קטנה!',
    emoji: '🤝',
    financialImpact: 700,
  },
  // Month 7, very low happiness penalty
  {
    minHappiness: 0,
    maxHappiness: 3,
    month: 7,
    text: 'ההסתגרות גובה מחיר, צריך טיפול רגשי.',
    emoji: '😔',
    financialImpact: -800,
  },
  // Month 9, high happiness bonus (post-layoff recovery)
  {
    minHappiness: 6,
    maxHappiness: 10,
    month: 9,
    text: 'למרות הפיטורים שמרת על גישה חיובית, חבר המליץ עליך למשרה!',
    emoji: '💪',
    financialImpact: 1000,
  },
  // Month 10, low happiness cost
  {
    minHappiness: 0,
    maxHappiness: 3,
    month: 10,
    text: 'שלושה חודשים בלי בילוי... ביטלת מנוי חדר כושר מרוב עצבים.',
    emoji: '😤',
    financialImpact: -300,
  },
  // Month 11, high happiness bonus
  {
    minHappiness: 6,
    maxHappiness: 10,
    month: 11,
    text: 'הנטוורקינג שלך הביא לקוח פרילנס קטן!',
    emoji: '💼',
    financialImpact: 1500,
  },
];

export const emergencyFundConfig: EmergencyFundConfig = {
  monthlyIncome: 10000,
  monthlyExpenses: 7000,
  events: emergencyEvents,
  totalMonths: 12,
};

/** Goal: 3 months of expenses */
export const FUND_TARGET = emergencyFundConfig.monthlyExpenses * 3; // ₪21,000
