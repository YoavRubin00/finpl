/** Types for the "Compound Interest Magic" simulation (Module 1-4) */

export interface CompoundSimConfig {
    /** Default starting lump sum (₪) */
    defaultInitialAmount: number;
    /** Default monthly contribution (₪) */
    defaultMonthlyContribution: number;
    /** Minimum years for slider */
    minYears: number;
    /** Maximum years for slider */
    maxYears: number;
    /** Annual interest rate (e.g. 0.08 = 8%) */
    annualInterestRate: number;
}

export interface CompoundSimState {
    /** Current initial lump sum (₪) */
    initialAmount: number;
    /** Current monthly contribution (₪) */
    monthlyContribution: number;
    /** Current years selected via slider */
    years: number;
    /** Total money put in (no interest): initialAmount + monthlyContribution * 12 * years */
    totalInvested: number;
    /** Total value with compound interest */
    totalCompoundValue: number;
}
