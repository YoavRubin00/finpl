/** Types for the "Bank Fee Combat" simulation game (Module 1-7) */

export interface FeeAttack {
  id: string;
  /** Hebrew fee name, e.g. "דמי ניהול חשבון" */
  feeName: string;
  /** Fee amount in ₪ */
  feeAmount: number;
  /** Visual lottie key for the fee */
  lottieKey: string;
  /** Hebrew description of the fee */
  description: string;
}

export interface DefenseOption {
  id: string;
  /** Hebrew label for the defense action */
  label: string;
  /** Effectiveness percentage 0-100 */
  effectiveness: number;
  /** Hebrew counter/feedback text shown after choosing */
  counterText: string;
}

export interface FeeAttackRound {
  /** The fee attack for this round */
  attack: FeeAttack;
  /** Available defense options */
  defenses: DefenseOption[];
}

export interface BankCombatConfig {
  /** Player's starting savings in ₪ */
  playerHealth: number;
  /** Array of fee attack rounds */
  rounds: FeeAttackRound[];
}

export interface BankCombatState {
  /** Player's remaining savings in ₪ */
  playerHealth: number;
  /** Bank's fee meter (starts at 100, decreases when fees are blocked) */
  bankHealth: number;
  /** Current round index (0-based) */
  round: number;
  /** Number of fees successfully blocked */
  feesBlocked: number;
  /** Number of fees absorbed (not blocked) */
  feesAbsorbed: number;
  /** Total money saved by blocking fees in ₪ */
  totalSaved: number;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type BankCombatGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface BankCombatScore {
  /** Letter grade */
  grade: BankCombatGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Total money saved per year in ₪ */
  totalSaved: number;
  /** Number of fees blocked */
  feesBlocked: number;
}
