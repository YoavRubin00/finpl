import { useState, useCallback, useMemo } from 'react';
import type {
    MinusTrapSwipeConfig,
    MinusTrapSwipeState,
    MinusTrapSwipeScore,
    MinusTrapGrade,
    SwipeCard,
    SwipeHistoryEntry,
} from './minusTrapTypes';

/* ------------------------------------------------------------------ */
/*  useMinusTrapSwipe — Tinder-style expense swipe game logic          */
/* ------------------------------------------------------------------ */

const INITIAL_STATE = (startingBalance: number): MinusTrapSwipeState => ({
    balance: startingBalance,
    cardsPlayed: 0,
    interestPaid: 0,
    monthsInMinus: 0,
    activeRecurring: [],
    penalties: [],
    isGameOver: false,
    isComplete: false,
});

export function useMinusTrapSwipe(config: MinusTrapSwipeConfig) {
    const [state, setState] = useState<MinusTrapSwipeState>(
        INITIAL_STATE(config.startingBalance),
    );

    // Track swipe counts separately (not in state to avoid re-render churn)
    const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryEntry[]>([]);

    /** Current card (null when deck is exhausted) */
    const currentCard = useMemo((): SwipeCard | null => {
        if (state.cardsPlayed >= config.cards.length) return null;
        return config.cards[state.cardsPlayed];
    }, [config.cards, state.cardsPlayed]);

    /** Apply interest if balance is negative */
    const applyInterest = (
        balance: number,
        prevInterestPaid: number,
        rate: number,
    ): { balance: number; interestPaid: number; interestCharged: number } => {
        if (balance >= 0) return { balance, interestPaid: prevInterestPaid, interestCharged: 0 };
        const interestCharged = Math.round(Math.abs(balance) * rate);
        return {
            balance: balance - interestCharged,
            interestPaid: prevInterestPaid + interestCharged,
            interestCharged,
        };
    };

    /** Process queued penalties that should trigger at this card index */
    const processPenalties = (
        penalties: MinusTrapSwipeState['penalties'],
        cardIndex: number,
        balance: number,
    ): { balance: number; penalties: MinusTrapSwipeState['penalties']; penaltiesTriggered: number } => {
        let newBalance = balance;
        let penaltiesTriggered = 0;
        const updatedPenalties = penalties.map((p) => {
            if (!p.applied && p.triggersAtCard <= cardIndex) {
                newBalance -= p.amount;
                penaltiesTriggered += 1;
                return { ...p, applied: true };
            }
            return p;
        });
        return { balance: newBalance, penalties: updatedPenalties, penaltiesTriggered };
    };

    /** Swipe right = buy / accept */
    const swipeRight = useCallback(
        (card: SwipeCard) => {
            if (state.isGameOver || state.isComplete) return;

            setState((prev) => {
                const nextCardIndex = prev.cardsPlayed + 1;
                let newBalance = prev.balance + card.amount;

                // 1. Apply recurring costs for active subscriptions
                let recurringTotal = 0;
                for (const r of prev.activeRecurring) {
                    recurringTotal += r.costPerCard;
                }
                newBalance -= recurringTotal;

                // 2. If this card has a recurringCost, add to activeRecurring
                const newRecurring = card.recurringCost
                    ? [
                          ...prev.activeRecurring,
                          { id: card.id, costPerCard: card.recurringCost },
                      ]
                    : [...prev.activeRecurring];

                // 3. Process any queued penalties that trigger now
                const penaltyResult = processPenalties(
                    prev.penalties,
                    nextCardIndex,
                    newBalance,
                );
                newBalance = penaltyResult.balance;

                // 4. Apply overdraft interest
                const interestResult = applyInterest(
                    newBalance,
                    prev.interestPaid,
                    config.overdraftInterestRate,
                );
                newBalance = interestResult.balance;

                // 5. Track months in minus
                const newMonthsInMinus =
                    prev.monthsInMinus + (newBalance < 0 ? 1 : 0);

                // 6. Check game over / complete
                const isGameOver = newBalance <= config.gameOverThreshold;
                const isComplete =
                    !isGameOver && nextCardIndex >= config.cards.length;

                return {
                    balance: newBalance,
                    cardsPlayed: nextCardIndex,
                    interestPaid: interestResult.interestPaid,
                    monthsInMinus: newMonthsInMinus,
                    activeRecurring: newRecurring,
                    penalties: penaltyResult.penalties,
                    isGameOver,
                    isComplete,
                };
            });

            setSwipeHistory((prev) => [
                ...prev,
                { cardId: card.id, direction: 'right', amount: card.amount },
            ]);
        },
        [config, state.isGameOver, state.isComplete],
    );

    /** Swipe left = skip / refuse */
    const swipeLeft = useCallback(
        (card: SwipeCard) => {
            if (state.isGameOver || state.isComplete) return;

            setState((prev) => {
                const nextCardIndex = prev.cardsPlayed + 1;
                let newBalance = prev.balance;

                // 1. If mandatory, queue penalty for later
                const newPenalties = [...prev.penalties];
                if (card.isMandatory && card.skipPenalty) {
                    const delay = card.penaltyDelay ?? 2;
                    newPenalties.push({
                        cardId: card.id,
                        amount: card.skipPenalty,
                        applied: false,
                        triggersAtCard: nextCardIndex + delay,
                    });
                }

                // 2. Process any queued penalties that trigger now
                const penaltyResult = processPenalties(
                    newPenalties,
                    nextCardIndex,
                    newBalance,
                );
                newBalance = penaltyResult.balance;

                // 3. Apply overdraft interest (interest applies on EVERY swipe)
                const interestResult = applyInterest(
                    newBalance,
                    prev.interestPaid,
                    config.overdraftInterestRate,
                );
                newBalance = interestResult.balance;

                // 4. Track months in minus
                const newMonthsInMinus =
                    prev.monthsInMinus + (newBalance < 0 ? 1 : 0);

                // 5. Check game over / complete
                const isGameOver = newBalance <= config.gameOverThreshold;
                const isComplete =
                    !isGameOver && nextCardIndex >= config.cards.length;

                return {
                    balance: newBalance,
                    cardsPlayed: nextCardIndex,
                    interestPaid: interestResult.interestPaid,
                    monthsInMinus: newMonthsInMinus,
                    activeRecurring: [...prev.activeRecurring],
                    penalties: penaltyResult.penalties,
                    isGameOver,
                    isComplete,
                };
            });

            setSwipeHistory((prev) => [
                ...prev,
                { cardId: card.id, direction: 'left', amount: 0 },
            ]);
        },
        [config, state.isGameOver, state.isComplete],
    );

    /** Final score (available when game is over or complete) */
    const score: MinusTrapSwipeScore | null = useMemo(() => {
        if (!state.isGameOver && !state.isComplete) return null;

        const cardsSwipedRight = swipeHistory.filter(
            (h) => h.direction === 'right',
        ).length;
        const cardsSwipedLeft = swipeHistory.filter(
            (h) => h.direction === 'left',
        ).length;

        const totalSpent = swipeHistory
            .filter((h) => h.direction === 'right' && h.amount < 0)
            .reduce((sum, h) => sum + Math.abs(h.amount), 0);
        const totalSkipped = cardsSwipedLeft;

        const penaltiesHit = state.penalties.filter((p) => p.applied).length;

        // Grade: blocked = F, otherwise score based on balance + penalties
        if (state.isGameOver) {
            return {
                finalBalance: state.balance,
                grade: 'F' as MinusTrapGrade,
                gradeLabel: 'הכרטיס נחסם. טבעת במינוס.',
                totalSpent,
                totalSkipped,
                interestPaid: state.interestPaid,
                penaltiesHit,
                cardsSwipedRight,
                cardsSwipedLeft,
            };
        }

        // Score: 100 base − penalty deductions
        const interestPenalty = Math.min(
            35,
            Math.round((state.interestPaid / config.startingBalance) * 35),
        );
        const penaltyPenalty = Math.min(25, penaltiesHit * 12);
        const minusPenalty = Math.min(
            20,
            Math.round(
                (state.monthsInMinus / config.cards.length) * 20,
            ),
        );
        // Bonus: positive final balance
        const balanceBonus =
            state.balance >= config.startingBalance ? 10 : 0;

        const rawScore =
            100 - interestPenalty - penaltyPenalty - minusPenalty + balanceBonus;
        const overallScore = Math.max(0, Math.min(100, rawScore));

        let grade: MinusTrapGrade;
        let gradeLabel: string;
        if (overallScore >= 90) {
            grade = 'S';
            gradeLabel = 'פנומן פיננסי! עמדת בפיתוי.';
        } else if (overallScore >= 75) {
            grade = 'A';
            gradeLabel = 'מנהל סיכונים מעולה.';
        } else if (overallScore >= 55) {
            grade = 'B';
            gradeLabel = 'שרדת, אבל ספגת קנסות.';
        } else if (overallScore >= 35) {
            grade = 'C';
            gradeLabel = 'שרדת בקושי. המינוס מספיק עמוק.';
        } else {
            grade = 'F';
            gradeLabel = 'המינוס לקח אותך קרוב מדי לקצה.';
        }

        return {
            finalBalance: state.balance,
            grade,
            gradeLabel,
            totalSpent,
            totalSkipped,
            interestPaid: state.interestPaid,
            penaltiesHit,
            cardsSwipedRight,
            cardsSwipedLeft,
        };
    }, [state, swipeHistory, config]);

    /** Reset to initial state */
    const resetGame = useCallback(() => {
        setState(INITIAL_STATE(config.startingBalance));
        setSwipeHistory([]);
    }, [config.startingBalance]);

    return {
        state,
        currentCard,
        swipeRight,
        swipeLeft,
        score,
        swipeHistory,
        resetGame,
    };
}
