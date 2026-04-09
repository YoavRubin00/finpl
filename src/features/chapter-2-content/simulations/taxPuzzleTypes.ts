/** Types for the "Tax Credit Puzzle" simulation game (Module 2-11) */

export interface TaxCredit {
  id: string;
  /** Hebrew name of the tax credit */
  name: string;
  /** Credit points value */
  pointsValue: number;
  /** Character attributes that make this credit eligible */
  eligibleFor: string[];
  /** Visual lottie */
  lottie: number;
  /** Hebrew description of the credit */
  description: string;
}

export interface CharacterProfile {
  /** Character name (Hebrew) */
  name: string;
  /** Character age */
  age: number;
  /** Visual emoji */
  emoji: string;
  /** Attributes that determine credit eligibility */
  attributes: string[];
  /** Gross monthly salary in ₪ */
  grossSalary: number;
  /** Hebrew description / backstory */
  description: string;
}

export interface TaxPuzzleConfig {
  /** Array of character profiles (3 levels) */
  characters: CharacterProfile[];
  /** All available tax credits */
  allCredits: TaxCredit[];
  /** Value of one tax credit point in ₪ */
  pointValue: number;
}

export interface TaxPuzzleState {
  /** Index of current character (0-2) */
  currentCharacterIndex: number;
  /** IDs of credits applied to current character */
  appliedCredits: string[];
  /** Number of rejected (wrong) attempts */
  rejectedAttempts: number;
  /** Current character's gross salary */
  grossSalary: number;
  /** Tax before applying credits */
  taxBefore: number;
  /** Tax after applying credits */
  taxAfter: number;
  /** Net salary before applying credits */
  netBefore: number;
  /** Net salary after applying credits */
  netAfter: number;
  /** Whether the game is complete (all 3 characters done) */
  isComplete: boolean;
}

export type TaxPuzzleGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface TaxPuzzleScore {
  /** Letter grade */
  grade: TaxPuzzleGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Monthly tax savings in ₪ */
  moneySavedMonthly: number;
  /** Yearly tax savings in ₪ */
  moneySavedYearly: number;
  /** Number of correctly applied credits */
  correctCredits: number;
  /** Number of wrong attempts */
  wrongAttempts: number;
  /** Whether all credits were applied perfectly with zero wrong attempts */
  perfectMatch: boolean;
}
