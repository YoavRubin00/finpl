/** Types for the "Payslip Ninja" simulation game (Module 1-5) */

export type PayslipCategory = 'tax' | 'pension' | 'net';

export interface PayslipItem {
  id: string;
  /** Hebrew label, e.g. "מס הכנסה" */
  label: string;
  /** Visual emoji for the item */
  emoji: string;
  /** Classification category: tax, pension, or net salary */
  category: PayslipCategory;
  /** Amount in ₪ */
  amount: number;
}

export interface PayslipNinjaConfig {
  /** Array of payslip items to classify */
  items: PayslipItem[];
  /** Time allowed per item in milliseconds */
  timePerRound: number;
  /** Total number of rounds (items to classify) */
  totalRounds: number;
}

export interface PayslipNinjaState {
  /** Current score */
  score: number;
  /** Current correct-answer streak */
  streak: number;
  /** Index of current round (0-based) */
  currentRound: number;
  /** Number of correctly classified items */
  correctCount: number;
  /** Number of incorrectly classified items */
  wrongCount: number;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type PayslipGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface PayslipNinjaScore {
  /** Accuracy percentage 0-100 */
  accuracy: number;
  /** Letter grade */
  grade: PayslipGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
}
