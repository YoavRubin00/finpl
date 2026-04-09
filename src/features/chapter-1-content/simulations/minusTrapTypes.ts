/** Types for the "Minus Trap" simulation game (Module 1-2) */

/* ── Legacy types (used by current MinusTrapGameScreen until US-004 rewrite) ── */

export interface MinusOption {
    id: string;
    label: string;
    amount: number;
    feedback: string;
    isRisky: boolean;
}

export interface MinusScenario {
    id: string;
    question: string;
    emoji: string;
    options: MinusOption[];
}

export interface MinusTrapGameConfig {
    startingBalance: number;
    overdraftRate: number;
    specialRate: number;
    overdraftLimit: number;
    scenarios: MinusScenario[];
}

export interface MinusTrapGameState {
    balance: number;
    month: number;
    interestPaid: number;
    monthsInMinus: number;
    peakDebt: number;
    choices: { scenarioId: string; optionId: string }[];
    isComplete: boolean;
}

export type MinusTrapGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface MinusTrapScore {
    overallScore: number;
    grade: MinusTrapGrade;
    gradeLabel: string;
    interestPaid: number;
    peakDebt: number;
    monthsInMinus: number;
}

/* ── New Swipe Card types (PRD50 — Tinder-style rewrite) ── */

export type SwipeCardType = 'want' | 'need' | 'trap' | 'income';

export interface SwipeCard {
    id: string;
    /** Card title (Hebrew) */
    title: string;
    /** Display emoji */
    emoji: string;
    /** Amount: negative = expense, positive = income */
    amount: number;
    /** Card category */
    cardType: SwipeCardType;
    /** True if skipping (swipe left) triggers a penalty */
    isMandatory: boolean;
    /** Penalty amount when a mandatory card is skipped */
    skipPenalty?: number;
    /** Recurring cost deducted on every future swipe-right */
    recurringCost?: number;
    /** Number of cards before a skipped-mandatory penalty fires */
    penaltyDelay?: number;
}

export interface ActiveRecurring {
    id: string;
    costPerCard: number;
}

export interface QueuedPenalty {
    cardId: string;
    amount: number;
    /** Whether this penalty has already been applied */
    applied: boolean;
    /** Card index at which the penalty triggers */
    triggersAtCard: number;
}

export interface MinusTrapSwipeState {
    balance: number;
    cardsPlayed: number;
    interestPaid: number;
    monthsInMinus: number;
    activeRecurring: ActiveRecurring[];
    penalties: QueuedPenalty[];
    isGameOver: boolean;
    isComplete: boolean;
}

export interface MinusTrapSwipeScore {
    finalBalance: number;
    grade: MinusTrapGrade;
    gradeLabel: string;
    totalSpent: number;
    totalSkipped: number;
    interestPaid: number;
    penaltiesHit: number;
    cardsSwipedRight: number;
    cardsSwipedLeft: number;
}

export interface MinusTrapSwipeConfig {
    startingBalance: number;
    gameOverThreshold: number;
    overdraftInterestRate: number;
    cards: SwipeCard[];
}

export interface SwipeHistoryEntry {
    cardId: string;
    direction: 'right' | 'left';
    amount: number;
}
