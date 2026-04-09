import { useState, useCallback, useMemo } from 'react';

import type {
  TaxPuzzleState,
  TaxPuzzleScore,
  TaxPuzzleGrade,
  TaxCredit,
} from './taxPuzzleTypes';
import { taxPuzzleConfig, calculateMonthlyTax } from './taxPuzzleData';

/** Per-character results tracked across all 3 levels */
interface CharacterResult {
  correctCredits: number;
  wrongAttempts: number;
  totalEligible: number;
  moneySavedMonthly: number;
}

function createInitialState(characterIndex: number): TaxPuzzleState {
  const character = taxPuzzleConfig.characters[characterIndex];
  if (!character) {
    throw new Error(`Invalid character index: ${characterIndex}`);
  }
  const taxBefore = calculateMonthlyTax(character.grossSalary);
  const netBefore = character.grossSalary - taxBefore;

  return {
    currentCharacterIndex: characterIndex,
    appliedCredits: [],
    rejectedAttempts: 0,
    grossSalary: character.grossSalary,
    taxBefore,
    taxAfter: taxBefore,
    netBefore,
    netAfter: netBefore,
    isComplete: false,
  };
}

function getEligibleCreditIds(characterIndex: number): string[] {
  const character = taxPuzzleConfig.characters[characterIndex];
  if (!character) return [];
  return taxPuzzleConfig.allCredits
    .filter((credit) =>
      credit.eligibleFor.some((attr) => character.attributes.includes(attr)),
    )
    .map((c) => c.id);
}

function computeGrade(
  totalCorrect: number,
  totalEligible: number,
  totalWrong: number,
): { grade: TaxPuzzleGrade; gradeLabel: string } {
  const isPerfect = totalCorrect === totalEligible && totalWrong === 0;
  if (isPerfect) return { grade: 'S', gradeLabel: 'מושלם' };

  const accuracy =
    totalEligible > 0 ? totalCorrect / totalEligible : 0;
  if (accuracy >= 0.9 && totalWrong <= 1)
    return { grade: 'A', gradeLabel: 'מצוין' };
  if (accuracy >= 0.7) return { grade: 'B', gradeLabel: 'טוב' };
  if (accuracy >= 0.5) return { grade: 'C', gradeLabel: 'סביר' };
  return { grade: 'F', gradeLabel: 'צריך שיפור' };
}

export function useTaxPuzzle() {
  const [state, setState] = useState<TaxPuzzleState>(createInitialState(0));
  const [characterResults, setCharacterResults] = useState<CharacterResult[]>(
    [],
  );

  const currentCharacter = useMemo(
    () => taxPuzzleConfig.characters[state.currentCharacterIndex] ?? null,
    [state.currentCharacterIndex],
  );

  const eligibleCreditIds = useMemo(
    () => getEligibleCreditIds(state.currentCharacterIndex),
    [state.currentCharacterIndex],
  );

  /** Returns 'applied' | 'rejected' so the UI can animate accordingly */
  const applyCredit = useCallback(
    (credit: TaxCredit): 'applied' | 'rejected' => {
      // Check if already applied
      if (state.appliedCredits.includes(credit.id)) return 'rejected';

      // Check eligibility: credit.eligibleFor must intersect character.attributes
      const character =
        taxPuzzleConfig.characters[state.currentCharacterIndex];
      if (!character) return 'rejected';

      const isEligible = credit.eligibleFor.some((attr) =>
        character.attributes.includes(attr),
      );

      if (!isEligible) {
        setState((prev) => ({
          ...prev,
          rejectedAttempts: prev.rejectedAttempts + 1,
        }));
        return 'rejected';
      }

      // Apply the credit — reduce tax, increase net
      const creditValue =
        credit.pointsValue * taxPuzzleConfig.pointValue;

      setState((prev) => {
        const newTaxAfter = Math.max(0, prev.taxAfter - creditValue);
        const taxReduction = prev.taxAfter - newTaxAfter;
        return {
          ...prev,
          appliedCredits: [...prev.appliedCredits, credit.id],
          taxAfter: newTaxAfter,
          netAfter: prev.netAfter + taxReduction,
        };
      });

      return 'applied';
    },
    [state.appliedCredits, state.currentCharacterIndex],
  );

  /** Confirm current character is done, move to next or complete */
  const confirmCharacter = useCallback(() => {
    const moneySavedMonthly = state.taxBefore - state.taxAfter;

    const result: CharacterResult = {
      correctCredits: state.appliedCredits.length,
      wrongAttempts: state.rejectedAttempts,
      totalEligible: eligibleCreditIds.length,
      moneySavedMonthly,
    };

    const nextResults = [...characterResults, result];
    setCharacterResults(nextResults);

    const nextIndex = state.currentCharacterIndex + 1;
    if (nextIndex >= taxPuzzleConfig.characters.length) {
      // All characters done
      setState((prev) => ({ ...prev, isComplete: true }));
    } else {
      // Advance to next character
      setState(createInitialState(nextIndex));
    }
  }, [
    state.taxBefore,
    state.taxAfter,
    state.appliedCredits.length,
    state.rejectedAttempts,
    state.currentCharacterIndex,
    eligibleCreditIds.length,
    characterResults,
  ]);

  const score: TaxPuzzleScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const totalCorrect = characterResults.reduce(
      (sum, r) => sum + r.correctCredits,
      0,
    );
    const totalEligible = characterResults.reduce(
      (sum, r) => sum + r.totalEligible,
      0,
    );
    const totalWrong = characterResults.reduce(
      (sum, r) => sum + r.wrongAttempts,
      0,
    );
    const totalMonthlySaved = characterResults.reduce(
      (sum, r) => sum + r.moneySavedMonthly,
      0,
    );

    const { grade, gradeLabel } = computeGrade(
      totalCorrect,
      totalEligible,
      totalWrong,
    );

    return {
      grade,
      gradeLabel,
      moneySavedMonthly: totalMonthlySaved,
      moneySavedYearly: totalMonthlySaved * 12,
      correctCredits: totalCorrect,
      wrongAttempts: totalWrong,
      perfectMatch: totalCorrect === totalEligible && totalWrong === 0,
    };
  }, [state.isComplete, characterResults]);

  const resetGame = useCallback(() => {
    setState(createInitialState(0));
    setCharacterResults([]);
  }, []);

  return {
    state,
    currentCharacter,
    eligibleCreditIds,
    applyCredit,
    confirmCharacter,
    score,
    characterResults,
    resetGame,
    config: taxPuzzleConfig,
  };
}
