/** Types for the "Snowball Debt" simulation game (Module 1-3) */

export type PaymentMethod = 'full' | 'installments' | 'credit';

export type BillChoice = 'full' | 'minimum';

export interface PurchaseOption {
    id: string;
    /** Button label */
    label: string;
    /** Payment method */
    method: PaymentMethod;
    /** Monthly cost to the player */
    monthlyAmount: number;
    /** Total real cost (including interest if credit) */
    totalCost: number;
    /** Short feedback shown after picking this option */
    feedback: string;
}

export interface PurchaseScenario {
    id: string;
    /** Item name, e.g. "לפטופ חדש לעבודה" */
    item: string;
    /** Emoji for visual flair */
    emoji: string;
    /** Price of the item */
    price: number;
    /** Scenario description */
    description: string;
    /** Available payment options */
    options: PurchaseOption[];
}

export interface SnowballGameConfig {
    /** Virtual monthly salary */
    monthlySalary: number;
    /** Minimum payment percentage of total debt (e.g. 0.05 = 5%) */
    minimumPaymentPercent: number;
    /** Monthly interest rate on credit debt (e.g. 0.015 = 1.5%) */
    creditInterestRate: number;
    /** Purchase scenarios */
    scenarios: PurchaseScenario[];
}

export interface SnowballGameState {
    /** Current month (1-based) */
    month: number;
    /** Monthly salary */
    salary: number;
    /** Total accumulated debt */
    totalDebt: number;
    /** Total monthly obligations (installments + minimum payments) */
    monthlyObligations: number;
    /** Total interest paid so far */
    interestPaid: number;
    /** Visual snowball size (debt/salary ratio) */
    snowballSize: number;
    /** History of choices */
    choices: { scenarioId: string; optionId: string; billChoice: BillChoice | null }[];
    /** Whether all rounds are done */
    isComplete: boolean;
}

export interface SnowballScore {
    /** 0-100 rating */
    overallScore: number;
    /** Letter grade */
    grade: 'S' | 'A' | 'B' | 'C' | 'F';
    /** Hebrew grade label */
    gradeLabel: string;
    /** Total interest paid during the game */
    totalInterestPaid: number;
    /** Highest debt reached */
    peakDebt: number;
    /** Percentage of income remaining after obligations */
    freeIncomePercent: number;
}
