import { useState, useCallback, useMemo, useRef } from 'react';
import type {
    EmergencyFundConfig,
    EmergencyFundState,
    EmergencyFundScore,
    EmergencyFundGrade,
    EmergencyEvent,
    SavingsChoice,
} from './emergencyFundTypes';
import { generateSchedule, savingsOptions, happinessEvents } from './emergencyFundData';

/* ------------------------------------------------------------------ */
/*  useEmergencyFund — core logic hook for Emergency Fund Trampoline   */
/* ------------------------------------------------------------------ */

/** Annual loan interest rate (12%) → monthly rate */
const MONTHLY_LOAN_RATE = 0.12 / 12; // 1% per month

/** Months affected by layoff (zero income) */
const LAYOFF_MONTHS = new Set([8, 9]);

/** Internal state extends public state with outstanding loan tracking */
interface InternalState extends EmergencyFundState {
    outstandingLoan: number;
}

/** Feedback info from the last month processed */
export interface MonthResult {
    savingsAdded: number;
    event: EmergencyEvent | null;
    absorbed: boolean;
    loanTaken: number;
    expenseShortfall: number;
    happinessEvent: { text: string; emoji: string; financialImpact: number } | null;
}

const INITIAL_STATE: InternalState = {
    fundBalance: 0,
    loansTaken: 0,
    loanInterest: 0,
    month: 1,
    eventsHandled: 0,
    eventsMissed: 0,
    happiness: 5,
    isComplete: false,
    outstandingLoan: 0,
};

export function useEmergencyFund(config: EmergencyFundConfig) {
    const [internal, setInternal] = useState<InternalState>(INITIAL_STATE);
    const [lastMonthResult, setLastMonthResult] = useState<MonthResult | null>(null);
    const scheduleRef = useRef<Record<number, string>>(generateSchedule());

    /** Get the emergency event for a given month (if any) */
    const getEventForMonth = useCallback(
        (month: number): EmergencyEvent | null => {
            const eventId = scheduleRef.current[month];
            if (!eventId) return null;
            return config.events.find((e) => e.id === eventId) ?? null;
        },
        [config.events],
    );

    /** Public state (without internal outstandingLoan) */
    const state: EmergencyFundState = useMemo(() => {
        const { outstandingLoan: _, ...publicState } = internal;
        return publicState;
    }, [internal]);

    /** Current month's event (for screen to preview) */
    const currentEvent: EmergencyEvent | null = useMemo(
        () => getEventForMonth(internal.month),
        [getEventForMonth, internal.month],
    );

    /** Whether the NEXT month has an emergency event (for preview hint) */
    const nextMonthHasEvent: boolean = useMemo(
        () => getEventForMonth(internal.month + 1) !== null,
        [getEventForMonth, internal.month],
    );

    /** Whether current month is a layoff month (no income) */
    const isLayoffMonth = useMemo(
        () => LAYOFF_MONTHS.has(internal.month),
        [internal.month],
    );

    /** Handle player choosing a savings rate for the current month */
    const handleSavingsChoice = useCallback(
        (choice: SavingsChoice) => {
            const option = savingsOptions.find((o) => o.choice === choice);
            if (!option) return;

            setInternal((prev) => {
                if (prev.isComplete) return prev;

                const month = prev.month;
                const disposableIncome = config.monthlyIncome - config.monthlyExpenses;

                let fundBalance = prev.fundBalance;
                let loansTaken = prev.loansTaken;
                let loanInterest = prev.loanInterest;
                let eventsHandled = prev.eventsHandled;
                let eventsMissed = prev.eventsMissed;
                let currentLoan = prev.outstandingLoan;
                let savingsAdded = 0;
                let expenseShortfall = 0;
                let happiness = Math.max(0, Math.min(10, prev.happiness + option.happinessImpact));

                // --- Step 1: Apply income & savings ---
                if (LAYOFF_MONTHS.has(month)) {
                    if (fundBalance >= config.monthlyExpenses) {
                        fundBalance -= config.monthlyExpenses;
                    } else {
                        expenseShortfall = config.monthlyExpenses - fundBalance;
                        fundBalance = 0;
                        currentLoan += expenseShortfall;
                        loansTaken += 1;
                    }
                } else {
                    savingsAdded = Math.round(disposableIncome * option.savingsRate);
                    fundBalance += savingsAdded;
                }

                // --- Step 2: Handle emergency event ---
                const event = getEventForMonth(month);
                let absorbed = false;
                let loanForEvent = 0;

                if (event && event.cost > 0) {
                    if (fundBalance >= event.cost) {
                        fundBalance -= event.cost;
                        eventsHandled += 1;
                        absorbed = true;
                    } else {
                        loanForEvent = event.cost - fundBalance;
                        fundBalance = 0;
                        currentLoan += loanForEvent;
                        loansTaken += 1;
                        eventsMissed += 1;
                    }
                } else if (event && event.cost === 0) {
                    eventsHandled += 1;
                    absorbed = true;
                }

                // --- Step 3: Happiness events ---
                let happinessEventResult: MonthResult['happinessEvent'] = null;
                const hEvent = happinessEvents.find(
                    (he) => he.month === month && happiness >= he.minHappiness && happiness <= he.maxHappiness,
                );
                if (hEvent) {
                    happinessEventResult = {
                        text: hEvent.text,
                        emoji: hEvent.emoji,
                        financialImpact: hEvent.financialImpact,
                    };
                    if (hEvent.financialImpact > 0) {
                        fundBalance += hEvent.financialImpact;
                    } else {
                        const cost = Math.abs(hEvent.financialImpact);
                        if (fundBalance >= cost) {
                            fundBalance -= cost;
                        } else {
                            const shortfall = cost - fundBalance;
                            fundBalance = 0;
                            currentLoan += shortfall;
                            loansTaken += 1;
                        }
                    }
                }

                // --- Step 4: Apply monthly loan interest ---
                if (currentLoan > 0) {
                    const monthlyInterest = Math.round(currentLoan * MONTHLY_LOAN_RATE);
                    loanInterest += monthlyInterest;
                    currentLoan += monthlyInterest;
                }

                // --- Step 5: Advance month ---
                const nextMonth = month + 1;
                const isComplete = nextMonth > config.totalMonths;

                setLastMonthResult({
                    savingsAdded,
                    event,
                    absorbed,
                    loanTaken: loanForEvent + expenseShortfall,
                    expenseShortfall,
                    happinessEvent: happinessEventResult,
                });

                return {
                    fundBalance: Math.round(fundBalance),
                    loansTaken,
                    loanInterest: Math.round(loanInterest),
                    month: isComplete ? month : nextMonth,
                    eventsHandled,
                    eventsMissed,
                    happiness,
                    isComplete,
                    outstandingLoan: Math.round(currentLoan),
                };
            });
        },
        [config, getEventForMonth],
    );

    /** Compute score when game is complete */
    const score: EmergencyFundScore | null = useMemo(() => {
        if (!internal.isComplete) return null;

        let grade: EmergencyFundGrade;
        let gradeLabel: string;

        const h = internal.happiness;
        const missed = internal.eventsMissed;
        const interest = internal.loanInterest;

        // S = great fund + decent happiness (balanced play rewarded)
        if (missed === 0 && interest === 0 && h >= 4) {
            grade = 'S';
            gradeLabel = '🏆 מושלם! קרן חזקה + חיים מאוזנים — זה הסוד';
        } else if (missed === 0 && interest === 0 && h < 4) {
            grade = 'A';
            gradeLabel = '🌟 קרן מושלמת, אבל ויתרת על הרבה — שווה לאזן יותר';
        } else if (missed <= 1 && interest < 500) {
            grade = 'A';
            gradeLabel = '🌟 מצוין! כמעט כל החירומים נספגו — חיסכון חכם';
        } else if (missed <= 2) {
            grade = 'B';
            gradeLabel = '👍 לא רע! חלק מהחירומים דרשו הלוואה — שווה לחסוך יותר';
        } else if (missed <= 3) {
            grade = 'C';
            gradeLabel = '⚠️ סביר. הלוואות רבות — קרן חירום חזקה יותר תמנע את זה';
        } else {
            grade = 'F';
            gradeLabel = '🚨 בעיה! רוב החירומים הפכו להלוואות יקרות — חובה לבנות קרן חירום';
        }

        return {
            grade,
            gradeLabel,
            fundFinalBalance: internal.fundBalance,
            totalLoanInterest: internal.loanInterest,
            eventsAbsorbed: internal.eventsHandled,
            happiness: internal.happiness,
        };
    }, [internal.isComplete, internal.fundBalance, internal.loanInterest, internal.eventsHandled, internal.eventsMissed, internal.happiness]);

    /** Reset game to initial state (new random schedule) */
    const resetGame = useCallback(() => {
        scheduleRef.current = generateSchedule();
        setInternal(INITIAL_STATE);
        setLastMonthResult(null);
    }, []);

    return {
        state,
        currentEvent,
        isLayoffMonth,
        nextMonthHasEvent,
        lastMonthResult,
        handleSavingsChoice,
        score,
        resetGame,
    };
}
