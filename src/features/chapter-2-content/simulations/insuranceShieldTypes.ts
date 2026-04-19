/** Types for the "Insurance Shield" simulation game (Module 2-14) */

export type EventSeverity = 'minor' | 'major' | 'catastrophic';

export interface InsuranceType {
  /** Unique identifier */
  id: string;
  /** Hebrew display name */
  name: string;
  /** Visual lottie */
  lottie: number;
  /** Monthly premium cost (₪) */
  monthlyCost: number;
  /** Annual premium cost (₪) */
  annualCost: number;
  /** Array of coverage category IDs this insurance covers */
  covers: string[];
  /** Hebrew description of what this insurance covers */
  description: string;
}

export interface LifeEvent {
  /** Unique identifier */
  id: string;
  /** Hebrew description of the life event */
  description: string;
  /** Visual lottie */
  lottie: number;
  /** Damage amount in ₪ if not insured */
  damage: number;
  /** Array of insurance IDs required to block this event */
  requiredInsurance: string[];
  /** Event severity level */
  severity: EventSeverity;
}

export type InsuranceShieldPhase = 'shopping' | 'events' | 'results';

export interface InsuranceShieldConfig {
  /** Available insurance policies to purchase */
  availableInsurances: InsuranceType[];
  /** Life events that will occur in Phase 2 */
  events: LifeEvent[];
  /** Monthly budget cap for insurance premiums (₪) */
  monthlyBudget: number;
}

export interface InsuranceShieldState {
  /** Current game phase */
  phase: InsuranceShieldPhase;
  /** IDs of purchased insurance policies */
  activeInsurances: string[];
  /** Total monthly premiums being paid (₪) */
  totalPremiums: number;
  /** Total damage blocked by insurance (₪) */
  totalBlocked: number;
  /** Total damage received (uninsured) (₪) */
  totalDamage: number;
  /** Money wasted on duplicate coverage (₪) */
  duplicatesWasted: number;
  /** Current event round (0-based) */
  round: number;
  /** Remaining savings health (₪), starts at 200,000 */
  savingsHealth: number;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type InsuranceShieldGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface InsuranceShieldScore {
  /** Letter grade */
  grade: InsuranceShieldGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Net savings remaining (₪) */
  netSavings: number;
  /** Number of duplicate coverages detected */
  duplicatesFound: number;
  /** Number of events fully blocked by insurance */
  eventsFullyBlocked: number;
  /** Number of events not covered (damage taken) */
  eventsMissed: number;
  /** Total annual premium cost (₪) */
  totalAnnualPremiums: number;
  /** Total damage blocked (₪) */
  totalDamageBlocked: number;
  /** Total damage received (₪) */
  totalDamageReceived: number;
}
