/** Types for the "Car Loan Race" simulation game (Module 1-6) */

export type InterestEffect = 'increase' | 'decrease' | 'neutral';

export interface CarLoanOption {
  id: string;
  /** Hebrew button label */
  label: string;
  /** Monthly payment amount in ₪ */
  monthlyPayment: number;
  /** How this choice affects the interest burden */
  interestEffect: InterestEffect;
  /** Hebrew feedback text shown after choosing */
  feedback: string;
}

export interface CarLoanScenario {
  id: string;
  /** Hebrew description of the scenario */
  description: string;
  /** Visual emoji for the scenario */
  emoji: string;
  /** Available options for the player */
  options: CarLoanOption[];
}

export interface CarLoanConfig {
  /** Initial car value in ₪ */
  carValue: number;
  /** Initial loan amount in ₪ */
  loanAmount: number;
  /** Base annual interest rate (e.g. 0.06 = 6%) */
  baseInterestRate: number;
  /** Number of rounds (months) */
  months: number;
  /** Scenario cards for each round */
  scenarios: CarLoanScenario[];
}

export interface CarLoanState {
  /** Remaining loan balance in ₪ */
  remainingLoan: number;
  /** Total interest paid so far in ₪ */
  totalInterestPaid: number;
  /** Current depreciated car value in ₪ */
  carCurrentValue: number;
  /** Current month (0-based round index) */
  month: number;
  /** Car speed indicator 0-100 (inversely proportional to interest burden) */
  speed: number;
  /** Whether the bank repossessed the car */
  isRepossessed: boolean;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type CarLoanGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface CarLoanScore {
  /** Letter grade */
  grade: CarLoanGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Total amount paid over the loan lifetime in ₪ */
  totalPaid: number;
  /** Portion of total paid that was interest in ₪ */
  interestPortion: number;
  /** Final car value after depreciation in ₪ */
  carFinalValue: number;
}
