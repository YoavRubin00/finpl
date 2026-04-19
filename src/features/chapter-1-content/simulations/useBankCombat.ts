import { useState, useCallback, useMemo } from 'react';
import type {
    BankCombatConfig,
    BankCombatState,
    BankCombatScore,
    BankCombatGrade,
    DefenseOption,
    FeeAttackRound,
} from './bankCombatTypes';

/* ------------------------------------------------------------------ */
/*  useBankCombat, core logic hook for the Bank Fee Combat sim        */
/* ------------------------------------------------------------------ */

/** Bank health damage per blocked fee (100 / total rounds) */
const BANK_DAMAGE_PER_BLOCK = 100 / 6;

export function useBankCombat(config: BankCombatConfig) {
    const [state, setState] = useState<BankCombatState>({
        playerHealth: config.playerHealth,
        bankHealth: 100,
        round: 0,
        feesBlocked: 0,
        feesAbsorbed: 0,
        totalSaved: 0,
        isComplete: false,
    });

    /** Feedback text from the last chosen defense */
    const [lastFeedback, setLastFeedback] = useState<string | null>(null);

    /** Current round (or undefined when game is over) */
    const currentRound: FeeAttackRound | undefined = useMemo(
        () => config.rounds[state.round],
        [config.rounds, state.round],
    );

    /** Handle player choosing a defense option */
    const handleDefense = useCallback(
        (defense: DefenseOption) => {
            setLastFeedback(defense.counterText);

            setState((prev) => {
                if (prev.isComplete) return prev;

                const currentAttack = config.rounds[prev.round];
                if (!currentAttack) return prev;

                const feeAmount = currentAttack.attack.feeAmount;
                const savedAmount = Math.round(feeAmount * defense.effectiveness / 100);
                const absorbedAmount = feeAmount - savedAmount;

                const isBlocked = defense.effectiveness > 0;
                const newPlayerHealth = prev.playerHealth - absorbedAmount;
                const newBankHealth = isBlocked
                    ? Math.max(0, prev.bankHealth - BANK_DAMAGE_PER_BLOCK * (defense.effectiveness / 100))
                    : prev.bankHealth;

                const nextRound = prev.round + 1;
                const isComplete = nextRound >= config.rounds.length;

                return {
                    playerHealth: Math.max(0, newPlayerHealth),
                    bankHealth: Math.round(newBankHealth),
                    round: isComplete ? prev.round : nextRound,
                    feesBlocked: defense.effectiveness > 0 ? prev.feesBlocked + 1 : prev.feesBlocked,
                    feesAbsorbed: defense.effectiveness === 0 ? prev.feesAbsorbed + 1 : prev.feesAbsorbed,
                    totalSaved: prev.totalSaved + savedAmount,
                    isComplete,
                };
            });
        },
        [config.rounds],
    );

    /** Compute score when game is complete */
    const score: BankCombatScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        const totalFees = config.rounds.reduce((sum, r) => sum + r.attack.feeAmount, 0);
        const savingsPercentage = totalFees > 0 ? (state.totalSaved / totalFees) * 100 : 0;

        let grade: BankCombatGrade;
        let gradeLabel: string;

        if (state.feesBlocked === config.rounds.length) {
            grade = 'S';
            gradeLabel = '🏆 לוחם/ת עמלות! חסמת את כל העמלות, הבנק מפחד ממך';
        } else if (savingsPercentage >= 80) {
            grade = 'A';
            gradeLabel = '🌟 מצוין! חסכת את רוב העמלות, ממשיך/ה כך';
        } else if (savingsPercentage >= 60) {
            grade = 'B';
            gradeLabel = '👍 לא רע! יש עוד מקום לחסוך בעמלות';
        } else if (savingsPercentage >= 40) {
            grade = 'C';
            gradeLabel = '⚠️ הבנק עדיין מרוויח ממך יותר מדי';
        } else {
            grade = 'F';
            gradeLabel = '🚨 הבנק שמח! אתה משלם עמלות מיותרות, שווה ללמוד להתמקח';
        }

        return {
            grade,
            gradeLabel,
            totalSaved: state.totalSaved,
            feesBlocked: state.feesBlocked,
        };
    }, [state.isComplete, state.totalSaved, state.feesBlocked, config.rounds]);

    /** Reset game to initial state */
    const resetGame = useCallback(() => {
        setState({
            playerHealth: config.playerHealth,
            bankHealth: 100,
            round: 0,
            feesBlocked: 0,
            feesAbsorbed: 0,
            totalSaved: 0,
            isComplete: false,
        });
        setLastFeedback(null);
    }, [config.playerHealth]);

    return {
        state,
        currentRound,
        lastFeedback,
        handleDefense,
        score,
        resetGame,
    };
}
