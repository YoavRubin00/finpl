/** Types for the "Emergency Fund Trampoline" simulation game (Module 1-9) */

export type EmergencySeverity = 'minor' | 'major' | 'catastrophic';

export interface EmergencyEvent {
  id: string;
  /** Hebrew name, e.g. "פנצ'ר" */
  name: string;
  /** Visual emoji for the event */
  emoji: string;
  /** Cost in ₪ */
  cost: number;
  /** Severity level */
  severity: EmergencySeverity;
}

export type SavingsChoice = 'save-more' | 'balanced' | 'spend-more';

export interface FundRound {
  /** Month number (1-12) */
  month: number;
  /** Monthly income in ₪ */
  income: number;
  /** Savings choice made by the player */
  spendingChoice: SavingsChoice;
  /** Resulting savings rate (0-1) applied to disposable income */
  savingsRate: number;
}

export interface EmergencyFundConfig {
  /** Monthly income in ₪ */
  monthlyIncome: number;
  /** Monthly fixed expenses in ₪ */
  monthlyExpenses: number;
  /** Emergency events that can occur during the game */
  events: EmergencyEvent[];
  /** Total months in the game */
  totalMonths: number;
}

export interface EmergencyFundState {
  /** Current emergency fund balance in ₪ */
  fundBalance: number;
  /** Number of loans taken due to insufficient fund */
  loansTaken: number;
  /** Cumulative loan interest paid in ₪ */
  loanInterest: number;
  /** Current month (1-based) */
  month: number;
  /** Number of emergencies successfully absorbed by the fund */
  eventsHandled: number;
  /** Number of emergencies that required taking a loan */
  eventsMissed: number;
  /** Lifestyle happiness score (0-10), affected by savings choices */
  happiness: number;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type EmergencyFundGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface EmergencyFundScore {
  /** Letter grade */
  grade: EmergencyFundGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Final emergency fund balance in ₪ */
  fundFinalBalance: number;
  /** Total loan interest paid in ₪ */
  totalLoanInterest: number;
  /** Number of emergencies absorbed by the fund */
  eventsAbsorbed: number;
  /** Final happiness score */
  happiness: number;
}
