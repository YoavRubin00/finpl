/** Types for the "Budget Minister" simulation game (Module 1) */

export type BudgetCategory = 'needs' | 'wants' | 'savings';

export interface DilemmaOption {
    id: string;
    /** Button label, e.g. "להזמין וולט ב-85 ש"ח" */
    label: string;
    /** Which bucket this expense/action belongs to */
    category: BudgetCategory;
    /** How much money this costs (positive = spending, negative = saving/earning) */
    amount: number;
    /** Short feedback shown after picking this option */
    feedback: string;
}

export interface BudgetDilemma {
    id: string;
    /** Emoji icon for the dilemma card */
    emoji: string;
    /** Scenario question, e.g. "יום שישי בערב, מה עושים?" */
    question: string;
    /** Lottie key for visual flair */
    lottieKey?: string;
    /** The available options */
    options: DilemmaOption[];
}

export interface BudgetGameConfig {
    /** Virtual monthly salary */
    salary: number;
    /** 50/30/20 limits derived from salary */
    needsLimit: number;
    wantsLimit: number;
    savingsTarget: number;
    /** Dilemma scenarios */
    dilemmas: BudgetDilemma[];
}

export interface BudgetGameState {
    spentNeeds: number;
    spentWants: number;
    saved: number;
    currentDilemmaIndex: number;
    choices: { dilemmaId: string; optionId: string }[];
    isComplete: boolean;
}

export interface BudgetScore {
    /** 0-100 rating */
    overallScore: number;
    needsScore: number;
    wantsScore: number;
    savingsScore: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'F';
    gradeLabel: string;
}
