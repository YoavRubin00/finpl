import { useState, useCallback, useMemo } from 'react';
import type {
    CarLoanConfig,
    CarLoanState,
    CarLoanScore,
    CarLoanGrade,
    CarLoanOption,
    CarLoanScenario,
} from './carLoanTypes';

/* ------------------------------------------------------------------ */
/*  useCarLoanGame, core logic hook for the Car Loan Race sim         */
/* ------------------------------------------------------------------ */

/** Monthly depreciation rate (1.5% per month) */
const DEPRECIATION_RATE = 0.015;
/** Repossession threshold: loan exceeds car value × 1.5 */
const REPOSSESSION_MULTIPLIER = 1.5;

/** Interest-effect multipliers applied to the base rate */
const INTEREST_EFFECT_MAP: Record<string, number> = {
    increase: 1.5,
    decrease: 0.5,
    neutral: 1.0,
};

export function useCarLoanGame(config: CarLoanConfig) {
    const [state, setState] = useState<CarLoanState>({
        remainingLoan: config.loanAmount,
        totalInterestPaid: 0,
        carCurrentValue: config.carValue,
        month: 0,
        speed: 100,
        isRepossessed: false,
        isComplete: false,
    });

    /** Feedback text from the last chosen option */
    const [lastFeedback, setLastFeedback] = useState<string | null>(null);

    /** Current scenario (or undefined when game is over) */
    const currentScenario: CarLoanScenario | undefined = useMemo(
        () => config.scenarios[state.month],
        [config.scenarios, state.month],
    );

    /** Handle player choosing an option for the current scenario */
    const handleChoice = useCallback(
        (option: CarLoanOption) => {
            setLastFeedback(option.feedback);

            setState((prev) => {
                if (prev.isComplete || prev.isRepossessed) return prev;

                // 1. Apply monthly interest on remaining loan
                const effectMultiplier = INTEREST_EFFECT_MAP[option.interestEffect] ?? 1.0;
                const monthlyInterestRate = (config.baseInterestRate / 12) * effectMultiplier;
                const monthlyInterest = prev.remainingLoan * monthlyInterestRate;

                // 2. Reduce loan by the monthly payment (minus the interest portion)
                const principalPaid = Math.max(0, option.monthlyPayment - monthlyInterest);
                const newRemainingLoan = Math.max(0, prev.remainingLoan - principalPaid);
                const newTotalInterestPaid = prev.totalInterestPaid + monthlyInterest;

                // 3. Depreciate car value
                const newCarValue = prev.carCurrentValue * (1 - DEPRECIATION_RATE);

                // 4. Check repossession: loan > car value × 1.5
                const isRepossessed = newRemainingLoan > newCarValue * REPOSSESSION_MULTIPLIER;

                // 5. Compute speed (inversely proportional to interest burden)
                // Interest burden = total interest paid / original loan amount
                const interestBurden = newTotalInterestPaid / config.loanAmount;
                const newSpeed = Math.max(0, Math.round(100 - interestBurden * 200));

                // 6. Advance month
                const nextMonth = prev.month + 1;
                const isComplete = isRepossessed || nextMonth >= config.months;

                return {
                    remainingLoan: Math.round(newRemainingLoan),
                    totalInterestPaid: Math.round(newTotalInterestPaid),
                    carCurrentValue: Math.round(newCarValue),
                    month: isComplete ? prev.month : nextMonth,
                    speed: newSpeed,
                    isRepossessed,
                    isComplete,
                };
            });
        },
        [config.baseInterestRate, config.loanAmount, config.months],
    );

    /** Compute score when game is complete */
    const score: CarLoanScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        const totalPaid = (config.loanAmount - state.remainingLoan) + state.totalInterestPaid;
        const interestPortion = state.totalInterestPaid;
        const carFinalValue = state.carCurrentValue;

        // Grade based on interest-to-loan ratio
        // S: paid off early with minimal interest, A-F based on ratio
        const interestRatio = interestPortion / config.loanAmount;

        let grade: CarLoanGrade;
        let gradeLabel: string;

        if (state.isRepossessed) {
            grade = 'F';
            gradeLabel = '🚨 הבנק תפס את הרכב! ההלוואה חרגה מערך הרכב';
        } else if (interestRatio <= 0.05) {
            grade = 'S';
            gradeLabel = '🏆 נהג/ת מצטיין/ת! כמעט ללא ריבית, כלכלן/ית אמיתי/ת';
        } else if (interestRatio <= 0.10) {
            grade = 'A';
            gradeLabel = '🌟 מעולה! שילמת מינימום ריבית על הרכב';
        } else if (interestRatio <= 0.18) {
            grade = 'B';
            gradeLabel = '👍 לא רע! אבל אפשר היה לחסוך עוד בריבית';
        } else if (interestRatio <= 0.28) {
            grade = 'C';
            gradeLabel = '⚠️ שילמת הרבה ריבית, שווה ללמוד על מימון רכב';
        } else {
            grade = 'F';
            gradeLabel = '🚨 הריבית אכלה אותך! הרכב עלה הרבה יותר ממה שחשבת';
        }

        return { grade, gradeLabel, totalPaid, interestPortion, carFinalValue };
    }, [state.isComplete, state.isRepossessed, state.remainingLoan, state.totalInterestPaid, state.carCurrentValue, config.loanAmount]);

    /** Reset game to initial state */
    const resetGame = useCallback(() => {
        setState({
            remainingLoan: config.loanAmount,
            totalInterestPaid: 0,
            carCurrentValue: config.carValue,
            month: 0,
            speed: 100,
            isRepossessed: false,
            isComplete: false,
        });
        setLastFeedback(null);
    }, [config.loanAmount, config.carValue]);

    return {
        state,
        currentScenario,
        lastFeedback,
        handleChoice,
        score,
        resetGame,
    };
}
