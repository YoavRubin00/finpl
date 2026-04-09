import { useState, useCallback, useMemo } from 'react';
import type {
    ShoppingCartConfig,
    ShoppingCartState,
    ShoppingCartScore,
    ShoppingCartGrade,
    ShoppingItem,
} from './shoppingCartTypes';

/* ------------------------------------------------------------------ */
/*  useShoppingCart — core logic hook for the Shopping Cart Race sim    */
/* ------------------------------------------------------------------ */

export function useShoppingCart(config: ShoppingCartConfig) {
    const [state, setState] = useState<ShoppingCartState>({
        cart: [],
        totalSpent: 0,
        budget: config.budget,
        essentialsCollected: 0,
        trapsAvoided: 0,
        trapsFallen: 0,
        currentIndex: 0,
        isComplete: false,
    });

    /** Current item being shown (or undefined when game is over) */
    const currentItem: ShoppingItem | undefined = useMemo(
        () => (state.isComplete ? undefined : config.items[state.currentIndex]),
        [config.items, state.currentIndex, state.isComplete],
    );

    /** Advance to next item or complete game */
    const advance = (prev: ShoppingCartState): ShoppingCartState => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= config.items.length) {
            return { ...prev, currentIndex: prev.currentIndex, isComplete: true };
        }
        return { ...prev, currentIndex: nextIndex };
    };

    /** Add current item to cart */
    const addToCart = useCallback(() => {
        setState((prev) => {
            if (prev.isComplete) return prev;
            const item = config.items[prev.currentIndex];
            if (!item) return prev;

            const newCart = [...prev.cart, item];
            const newTotalSpent = prev.totalSpent + item.price;

            const isEssential = item.category === 'essential';
            const isTrap = item.category === 'trap';

            return advance({
                ...prev,
                cart: newCart,
                totalSpent: newTotalSpent,
                essentialsCollected: isEssential
                    ? prev.essentialsCollected + 1
                    : prev.essentialsCollected,
                trapsFallen: isTrap ? prev.trapsFallen + 1 : prev.trapsFallen,
            });
        });
    }, [config.items]);

    /** Skip current item */
    const skipItem = useCallback(() => {
        setState((prev) => {
            if (prev.isComplete) return prev;
            const item = config.items[prev.currentIndex];
            if (!item) return prev;

            const isTrap = item.category === 'trap';

            return advance({
                ...prev,
                trapsAvoided: isTrap ? prev.trapsAvoided + 1 : prev.trapsAvoided,
            });
        });
    }, [config.items]);

    /** Compute score when game is complete */
    const score: ShoppingCartScore | null = useMemo(() => {
        if (!state.isComplete) return null;

        const totalTraps = config.items.filter((i) => i.category === 'trap').length;
        const essentialsMissed = config.essentialCount - state.essentialsCollected;
        const moneyWasted = state.cart
            .filter((i) => i.category === 'trap')
            .reduce((sum, i) => sum + i.price, 0);

        const overBudget = Math.max(0, state.totalSpent - config.budget);

        // Composite score: essentials collected, traps avoided, budget adherence
        const essentialScore = config.essentialCount > 0
            ? (state.essentialsCollected / config.essentialCount) * 40
            : 40;
        const trapScore = totalTraps > 0
            ? (state.trapsAvoided / totalTraps) * 40
            : 40;
        const budgetScore = overBudget === 0 ? 20 : Math.max(0, 20 - (overBudget / config.budget) * 20);

        const composite = essentialScore + trapScore + budgetScore;

        let grade: ShoppingCartGrade;
        let gradeLabel: string;

        if (composite >= 95 && essentialsMissed === 0 && state.trapsFallen === 0) {
            grade = 'S';
            gradeLabel = '🏆 קונה חכם/ה! כל המוצרים החיוניים, אף מלכודת — מאסטר!';
        } else if (composite >= 80) {
            grade = 'A';
            gradeLabel = '🌟 מצוין! קניות חכמות ויעילות';
        } else if (composite >= 65) {
            grade = 'B';
            gradeLabel = '👍 לא רע! אבל כמה מלכודות תפסו אותך';
        } else if (composite >= 50) {
            grade = 'C';
            gradeLabel = '⚠️ הסופר ניצח אותך הפעם — שווה לשים לב למלכודות';
        } else {
            grade = 'F';
            gradeLabel = '🚨 העגלה מלאה ב"מבצעים" — הארנק בוכה!';
        }

        return {
            grade,
            gradeLabel,
            moneyWasted,
            essentialsMissed,
            trapsAvoided: state.trapsAvoided,
        };
    }, [
        state.isComplete,
        state.essentialsCollected,
        state.trapsAvoided,
        state.trapsFallen,
        state.totalSpent,
        state.cart,
        config.items,
        config.essentialCount,
        config.budget,
    ]);

    /** Reset game to initial state */
    const resetGame = useCallback(() => {
        setState({
            cart: [],
            totalSpent: 0,
            budget: config.budget,
            essentialsCollected: 0,
            trapsAvoided: 0,
            trapsFallen: 0,
            currentIndex: 0,
            isComplete: false,
        });
    }, [config.budget]);

    return {
        state,
        currentItem,
        addToCart,
        skipItem,
        score,
        resetGame,
    };
}
