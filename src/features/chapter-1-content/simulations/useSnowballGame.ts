import { useState, useCallback, useMemo, useRef } from 'react';
import type {
    BillChoice,
    PurchaseOption,
    SnowballGameConfig,
    SnowballGameState,
    SnowballScore,
} from './snowballTypes';

/* ------------------------------------------------------------------ */
/*  useSnowballGame — core logic for the Snowball Debt simulation      */
/* ------------------------------------------------------------------ */

export function useSnowballGame(config: SnowballGameConfig) {
    const [state, setState] = useState<SnowballGameState>({
        month: 1,
        salary: config.monthlySalary,
        totalDebt: 0,
        monthlyObligations: 0,
        interestPaid: 0,
        snowballSize: 0,
        choices: [],
        isComplete: false,
    });

    const [peakDebt, setPeakDebt] = useState(0);
    const [pendingBillChoice, setPendingBillChoice] = useState(false);

    /** Store the option picked this round so handleBillChoice can record it */
    const pendingOptionRef = useRef<{ scenarioId: string; optionId: string }>({
        scenarioId: '',
        optionId: '',
    });

    const currentScenario = useMemo(
        () => config.scenarios[state.month - 1],
        [config.scenarios, state.month],
    );

    const freeIncomePercent = useMemo(
        () => Math.max(0, Math.round(((config.monthlySalary - state.monthlyObligations) / config.monthlySalary) * 100)),
        [config.monthlySalary, state.monthlyObligations],
    );

    /** Advance to the next month or complete the game */
    const advanceMonth = useCallback(
        (prev: SnowballGameState, scenarioId: string, optionId: string, billChoice: BillChoice | null): SnowballGameState => {
            const nextMonth = prev.month + 1;
            const isLast = nextMonth > config.scenarios.length;
            return {
                ...prev,
                month: isLast ? prev.month : nextMonth,
                isComplete: isLast,
                choices: [...prev.choices, { scenarioId, optionId, billChoice }],
            };
        },
        [config.scenarios.length],
    );

    /** Phase 1: player picks a purchase option */
    const handlePurchase = useCallback(
        (option: PurchaseOption) => {
            setState((prev) => {
                const scenario = config.scenarios[prev.month - 1];
                let newDebt = prev.totalDebt;
                let newObligations = prev.monthlyObligations;

                if (option.method === 'installments') {
                    newObligations += option.monthlyAmount;
                } else if (option.method === 'credit') {
                    newDebt += scenario.price;
                }
                // 'full' — no debt, no ongoing obligation

                const updated: SnowballGameState = {
                    ...prev,
                    totalDebt: newDebt,
                    monthlyObligations: newObligations,
                    snowballSize: newDebt / config.monthlySalary,
                };

                // Update peak debt
                if (newDebt > 0) {
                    setPeakDebt((p) => Math.max(p, newDebt));
                }

                // If there is any debt, we need a bill choice
                if (newDebt > 0) {
                    pendingOptionRef.current = { scenarioId: scenario.id, optionId: option.id };
                    setPendingBillChoice(true);
                    return updated;
                }

                // No debt — skip bill choice, advance month
                return advanceMonth(updated, scenario.id, option.id, null);
            });
        },
        [config, advanceMonth],
    );

    /** Phase 2: player chooses full bill payment or minimum */
    const handleBillChoice = useCallback(
        (choice: BillChoice) => {
            setPendingBillChoice(false);

            setState((prev) => {
                let newDebt = prev.totalDebt;
                let newInterestPaid = prev.interestPaid;

                // Apply interest on current debt
                const interest = newDebt * config.creditInterestRate;
                newDebt += interest;
                newInterestPaid += interest;

                if (choice === 'full') {
                    newDebt = 0;
                } else {
                    // Minimum: pay 5% of debt (after interest)
                    const minPayment = newDebt * config.minimumPaymentPercent;
                    newDebt -= minPayment;
                }

                // Round to avoid floating point drift
                newDebt = Math.round(newDebt * 100) / 100;
                newInterestPaid = Math.round(newInterestPaid * 100) / 100;

                setPeakDebt((p) => Math.max(p, newDebt));

                const updated: SnowballGameState = {
                    ...prev,
                    totalDebt: newDebt,
                    interestPaid: newInterestPaid,
                    snowballSize: newDebt / config.monthlySalary,
                };

                const { scenarioId, optionId } = pendingOptionRef.current;
                return advanceMonth(updated, scenarioId, optionId, choice);
            });
        },
        [config, advanceMonth],
    );

    /** Final score (null until game is complete) */
    const score: SnowballScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        // Interest penalty: 40 pts. 0 interest = 40, ≥ salary = 0
        const interestRatio = Math.min(state.interestPaid / config.monthlySalary, 1);
        const interestScore = Math.round((1 - interestRatio) * 40);

        // Peak debt penalty: 30 pts. 0 peak = 30, ≥ 2x salary = 0
        const peakRatio = Math.min(peakDebt / (config.monthlySalary * 2), 1);
        const peakScore = Math.round((1 - peakRatio) * 30);

        // Remaining debt: 30 pts. 0 remaining = 30, ≥ salary = 0
        const remainingRatio = Math.min(state.totalDebt / config.monthlySalary, 1);
        const remainingScore = Math.round((1 - remainingRatio) * 30);

        const overallScore = interestScore + peakScore + remainingScore;

        let grade: SnowballScore['grade'];
        let gradeLabel: string;
        if (overallScore >= 90) {
            grade = 'S';
            gradeLabel = 'מלך המזומן!';
        } else if (overallScore >= 75) {
            grade = 'A';
            gradeLabel = 'כמעט חף מחובות';
        } else if (overallScore >= 55) {
            grade = 'B';
            gradeLabel = 'כדור השלג צובר תאוצה';
        } else if (overallScore >= 35) {
            grade = 'C';
            gradeLabel = 'הריבית שולטת';
        } else {
            grade = 'F';
            gradeLabel = 'כדור השלג מחץ אותך';
        }

        return {
            overallScore,
            grade,
            gradeLabel,
            totalInterestPaid: state.interestPaid,
            peakDebt,
            freeIncomePercent,
        };
    }, [state, peakDebt, config.monthlySalary, freeIncomePercent]);

    /** Reset game to initial state */
    const resetGame = useCallback(() => {
        setState({
            month: 1,
            salary: config.monthlySalary,
            totalDebt: 0,
            monthlyObligations: 0,
            interestPaid: 0,
            snowballSize: 0,
            choices: [],
            isComplete: false,
        });
        setPeakDebt(0);
        setPendingBillChoice(false);
        pendingOptionRef.current = { scenarioId: '', optionId: '' };
    }, [config.monthlySalary]);

    return {
        state,
        currentScenario,
        freeIncomePercent,
        pendingBillChoice,
        handlePurchase,
        handleBillChoice,
        score,
        resetGame,
    };
}
