import { useState, useCallback, useMemo } from 'react';
import type {
    PayslipCategory,
    PayslipNinjaConfig,
    PayslipNinjaState,
    PayslipNinjaScore,
    PayslipGrade,
    PayslipItem,
} from './payslipNinjaTypes';

/* ------------------------------------------------------------------ */
/*  usePayslipNinja — core logic hook for the Payslip Ninja sim        */
/* ------------------------------------------------------------------ */

/** Points awarded for a correct classification */
const CORRECT_BASE = 10;
/** Points deducted for a wrong classification */
const WRONG_PENALTY = 5;

export function usePayslipNinja(config: PayslipNinjaConfig) {
    const [state, setState] = useState<PayslipNinjaState>({
        score: 0,
        streak: 0,
        currentRound: 0,
        correctCount: 0,
        wrongCount: 0,
        isComplete: false,
    });

    /** Current item to classify (or undefined when game is over) */
    const currentItem: PayslipItem | undefined = useMemo(
        () => config.items[state.currentRound],
        [config.items, state.currentRound],
    );

    /** Handle player tapping a classification bin */
    const classifyItem = useCallback(
        (chosenCategory: PayslipCategory) => {
            setState((prev) => {
                if (prev.isComplete) return prev;

                const item = config.items[prev.currentRound];
                if (!item) return prev;

                const isCorrect = item.category === chosenCategory;
                const nextRound = prev.currentRound + 1;
                const isLast = nextRound >= config.totalRounds;

                if (isCorrect) {
                    const streakBonus = prev.streak; // +1 per consecutive correct
                    return {
                        score: prev.score + CORRECT_BASE + streakBonus,
                        streak: prev.streak + 1,
                        currentRound: isLast ? prev.currentRound : nextRound,
                        correctCount: prev.correctCount + 1,
                        wrongCount: prev.wrongCount,
                        isComplete: isLast,
                    };
                }

                return {
                    score: Math.max(0, prev.score - WRONG_PENALTY),
                    streak: 0,
                    currentRound: isLast ? prev.currentRound : nextRound,
                    correctCount: prev.correctCount,
                    wrongCount: prev.wrongCount + 1,
                    isComplete: isLast,
                };
            });
        },
        [config.items, config.totalRounds],
    );

    /** Handle timer expiry — counts as a wrong answer */
    const handleTimeout = useCallback(() => {
        setState((prev) => {
            if (prev.isComplete) return prev;

            const nextRound = prev.currentRound + 1;
            const isLast = nextRound >= config.totalRounds;

            return {
                score: Math.max(0, prev.score - WRONG_PENALTY),
                streak: 0,
                currentRound: isLast ? prev.currentRound : nextRound,
                correctCount: prev.correctCount,
                wrongCount: prev.wrongCount + 1,
                isComplete: isLast,
            };
        });
    }, [config.totalRounds]);

    /** Compute score when game is complete */
    const score: PayslipNinjaScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        const total = state.correctCount + state.wrongCount;
        const accuracy = total > 0 ? Math.round((state.correctCount / total) * 100) : 0;

        let grade: PayslipGrade;
        let gradeLabel: string;
        if (accuracy >= 95) {
            grade = 'S';
            gradeLabel = '🏆 נינג׳ה תלוש! סיווגת כמו רואה חשבון מנוסה';
        } else if (accuracy >= 80) {
            grade = 'A';
            gradeLabel = '🌟 מעולה! מבינ/ה את התלוש ברמה גבוהה';
        } else if (accuracy >= 65) {
            grade = 'B';
            gradeLabel = '👍 לא רע! רוב הפריטים סווגו נכון';
        } else if (accuracy >= 50) {
            grade = 'C';
            gradeLabel = '⚠️ יש מקום לשיפור — שווה ללמוד את התלוש';
        } else {
            grade = 'F';
            gradeLabel = '🚨 התלוש עדיין מסתורי — בוא נתרגל שוב!';
        }

        return { accuracy, grade, gradeLabel };
    }, [state.isComplete, state.correctCount, state.wrongCount]);

    /** Reset game to initial state */
    const resetGame = useCallback(() => {
        setState({
            score: 0,
            streak: 0,
            currentRound: 0,
            correctCount: 0,
            wrongCount: 0,
            isComplete: false,
        });
    }, []);

    return {
        state,
        currentItem,
        classifyItem,
        handleTimeout,
        score,
        resetGame,
    };
}
