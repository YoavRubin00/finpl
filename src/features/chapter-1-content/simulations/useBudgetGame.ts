import { useState, useCallback, useMemo } from 'react';
import type {
    BudgetGameConfig,
    BudgetGameState,
    BudgetScore,
    DilemmaOption,
} from './budgetTypes';

/* ------------------------------------------------------------------ */
/*  useBudgetGame — core logic hook for the Budget Minister sim        */
/* ------------------------------------------------------------------ */

export function useBudgetGame(config: BudgetGameConfig) {
    const [state, setState] = useState<BudgetGameState>({
        spentNeeds: 0,
        spentWants: 0,
        saved: 0,
        currentDilemmaIndex: 0,
        choices: [],
        isComplete: false,
    });

    /** Remaining balance after all spending & saving */
    const balance = useMemo(
        () => config.salary - state.spentNeeds - state.spentWants - state.saved,
        [config.salary, state.spentNeeds, state.spentWants, state.saved],
    );

    /** Current dilemma (or undefined if game is over) */
    const currentDilemma = useMemo(
        () => config.dilemmas[state.currentDilemmaIndex],
        [config.dilemmas, state.currentDilemmaIndex],
    );

    /** Percentage filled for each bucket (can exceed 100%) */
    const needsPercent = useMemo(
        () => Math.round((state.spentNeeds / config.needsLimit) * 100),
        [state.spentNeeds, config.needsLimit],
    );
    const wantsPercent = useMemo(
        () => Math.round((state.spentWants / config.wantsLimit) * 100),
        [state.spentWants, config.wantsLimit],
    );
    const savingsPercent = useMemo(
        () => Math.round((state.saved / config.savingsTarget) * 100),
        [state.saved, config.savingsTarget],
    );

    /** Is any bucket over the limit? */
    const isNeedsOver = state.spentNeeds > config.needsLimit;
    const isWantsOver = state.spentWants > config.wantsLimit;

    /** Handle user picking a dilemma option */
    const handleChoice = useCallback(
        (option: DilemmaOption) => {
            setState((prev) => {
                const nextIndex = prev.currentDilemmaIndex + 1;
                const isLast = nextIndex >= config.dilemmas.length;

                const newState: BudgetGameState = {
                    ...prev,
                    choices: [
                        ...prev.choices,
                        { dilemmaId: config.dilemmas[prev.currentDilemmaIndex].id, optionId: option.id },
                    ],
                    currentDilemmaIndex: isLast ? prev.currentDilemmaIndex : nextIndex,
                    isComplete: isLast,
                };

                // Apply financial impact
                if (option.category === 'needs') {
                    newState.spentNeeds = prev.spentNeeds + option.amount;
                } else if (option.category === 'wants') {
                    newState.spentWants = prev.spentWants + option.amount;
                } else {
                    newState.saved = prev.saved + option.amount;
                }

                return newState;
            });
        },
        [config.dilemmas],
    );

    /** Calculate final score (called when game is complete) */
    const score: BudgetScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        // Score per bucket: how close to the ideal ratio (0-100, penalize overflows more)
        const calcScore = (actual: number, target: number, isSpending: boolean) => {
            if (target === 0) return actual === 0 ? 100 : 0;
            const ratio = actual / target;
            if (isSpending) {
                // For spending: under-spending is okay (100), over is bad
                if (ratio <= 1) return 100;
                return Math.max(0, Math.round(100 - (ratio - 1) * 200));
            }
            // For savings: hitting or exceeding target is great
            return Math.min(100, Math.round(ratio * 100));
        };

        const needsScore = calcScore(state.spentNeeds, config.needsLimit, true);
        const wantsScore = calcScore(state.spentWants, config.wantsLimit, true);
        const savingsScore = calcScore(state.saved, config.savingsTarget, false);

        const overallScore = Math.round(
            needsScore * 0.3 + wantsScore * 0.35 + savingsScore * 0.35,
        );

        let grade: BudgetScore['grade'];
        let gradeLabel: string;
        if (overallScore >= 90) {
            grade = 'S';
            gradeLabel = '🏆 שר האוצר! ניהלת את החודש בצורה מושלמת';
        } else if (overallScore >= 75) {
            grade = 'A';
            gradeLabel = '🌟 מנהל תקציב מעולה! קרוב מאוד לשלמות';
        } else if (overallScore >= 55) {
            grade = 'B';
            gradeLabel = '👍 סביר, אבל יש מקום לשיפור';
        } else if (overallScore >= 35) {
            grade = 'C';
            gradeLabel = '⚠️ צריך לעבוד על זה. חוק 50/30/20 ישמור עליך';
        } else {
            grade = 'F';
            gradeLabel = '🚨 אזעקה! בלי תקציב, העו"ש שלך בסכנה';
        }

        return { overallScore, needsScore, wantsScore, savingsScore, grade, gradeLabel };
    }, [state, config]);

    /** Reset game */
    const resetGame = useCallback(() => {
        setState({
            spentNeeds: 0,
            spentWants: 0,
            saved: 0,
            currentDilemmaIndex: 0,
            choices: [],
            isComplete: false,
        });
    }, []);

    return {
        state,
        balance,
        currentDilemma,
        needsPercent,
        wantsPercent,
        savingsPercent,
        isNeedsOver,
        isWantsOver,
        handleChoice,
        score,
        resetGame,
    };
}
