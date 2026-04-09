import { useState, useCallback, useMemo } from 'react';

import type {
  InsuranceShieldState,
  InsuranceShieldScore,
  InsuranceShieldGrade,
  LifeEvent,
} from './insuranceShieldTypes';
import { insuranceShieldConfig, DUPLICATE_PAIRS } from './insuranceShieldData';

const STARTING_SAVINGS = 200_000;

function createInitialState(): InsuranceShieldState {
  return {
    phase: 'shopping',
    activeInsurances: [],
    totalPremiums: 0,
    totalBlocked: 0,
    totalDamage: 0,
    duplicatesWasted: 0,
    round: 0,
    savingsHealth: STARTING_SAVINGS,
    isComplete: false,
  };
}

function computeGrade(
  eventsFullyBlocked: number,
  totalEvents: number,
  duplicatesFound: number,
  savingsHealth: number,
): { grade: InsuranceShieldGrade; gradeLabel: string } {
  const blockRate = totalEvents > 0 ? eventsFullyBlocked / totalEvents : 0;
  const savingsPreserved = savingsHealth > 0;

  // S: survived all, no duplicates, budget efficient
  if (blockRate === 1 && duplicatesFound === 0 && savingsPreserved) {
    return { grade: 'S', gradeLabel: 'מגן מושלם!' };
  }
  // A: blocked most, ≤1 duplicate
  if (blockRate >= 0.8 && duplicatesFound <= 1 && savingsPreserved) {
    return { grade: 'A', gradeLabel: 'מוגן היטב' };
  }
  // B: blocked majority
  if (blockRate >= 0.6) {
    return { grade: 'B', gradeLabel: 'הגנה סבירה' };
  }
  // C: blocked some
  if (blockRate >= 0.4) {
    return { grade: 'C', gradeLabel: 'חשוף לסיכונים' };
  }
  return { grade: 'F', gradeLabel: 'ללא הגנה' };
}

export function useInsuranceShield() {
  const [state, setState] = useState<InsuranceShieldState>(createInitialState);

  /** Toggle an insurance on/off during shopping phase */
  const toggleInsurance = useCallback((insuranceId: string) => {
    setState((prev) => {
      if (prev.phase !== 'shopping') return prev;

      const insurance = insuranceShieldConfig.availableInsurances.find(
        (ins) => ins.id === insuranceId,
      );
      if (!insurance) return prev;

      const isActive = prev.activeInsurances.includes(insuranceId);

      if (isActive) {
        // Remove insurance
        const newActive = prev.activeInsurances.filter((id) => id !== insuranceId);
        return {
          ...prev,
          activeInsurances: newActive,
          totalPremiums: prev.totalPremiums - insurance.monthlyCost,
        };
      }

      // Check budget before adding
      const newPremiums = prev.totalPremiums + insurance.monthlyCost;
      if (newPremiums > insuranceShieldConfig.monthlyBudget) {
        return prev; // Over budget — don't add
      }

      return {
        ...prev,
        activeInsurances: [...prev.activeInsurances, insuranceId],
        totalPremiums: newPremiums,
      };
    });
  }, []);

  /** Detect duplicate insurances among active selections */
  const duplicates = useMemo((): [string, string][] => {
    return DUPLICATE_PAIRS.filter(
      ([a, b]) =>
        state.activeInsurances.includes(a) && state.activeInsurances.includes(b),
    );
  }, [state.activeInsurances]);

  /** Calculate wasted money on duplicates (annual cost of the cheaper duplicate) */
  const duplicatesWastedAmount = useMemo((): number => {
    let wasted = 0;
    for (const [, b] of duplicates) {
      // The second in each pair is the redundant one (nituchim is subset of briut-mashlim)
      const ins = insuranceShieldConfig.availableInsurances.find((i) => i.id === b);
      if (ins) wasted += ins.annualCost;
    }
    return wasted;
  }, [duplicates]);

  /** Budget remaining */
  const budgetRemaining = useMemo(
    () => insuranceShieldConfig.monthlyBudget - state.totalPremiums,
    [state.totalPremiums],
  );

  /** Transition from shopping to events phase */
  const startEvents = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'shopping') return prev;
      return {
        ...prev,
        phase: 'events',
        duplicatesWasted: duplicatesWastedAmount,
      };
    });
  }, [duplicatesWastedAmount]);

  /** Current life event */
  const currentEvent: LifeEvent | null = useMemo(() => {
    if (state.phase !== 'events') return null;
    if (state.round >= insuranceShieldConfig.events.length) return null;
    return insuranceShieldConfig.events[state.round] ?? null;
  }, [state.phase, state.round]);

  /** Process the current life event — check if player's insurances cover it */
  const processEvent = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'events') return prev;

      const event = insuranceShieldConfig.events[prev.round];
      if (!event) return prev;

      // Check if all required insurances are in active set
      const isCovered = event.requiredInsurance.every((reqId) =>
        prev.activeInsurances.includes(reqId),
      );

      const nextRound = prev.round + 1;
      const isLastEvent = nextRound >= insuranceShieldConfig.events.length;

      if (isCovered) {
        return {
          ...prev,
          totalBlocked: prev.totalBlocked + event.damage,
          round: nextRound,
          phase: isLastEvent ? 'results' : 'events',
          isComplete: isLastEvent,
        };
      }

      // Not covered — damage hits savings
      const newSavings = Math.max(0, prev.savingsHealth - event.damage);
      return {
        ...prev,
        totalDamage: prev.totalDamage + event.damage,
        savingsHealth: newSavings,
        round: nextRound,
        phase: isLastEvent ? 'results' : 'events',
        isComplete: isLastEvent,
      };
    });
  }, []);

  /** Check if a specific event is covered by active insurances */
  const isEventCovered = useCallback(
    (event: LifeEvent): boolean => {
      return event.requiredInsurance.every((reqId) =>
        state.activeInsurances.includes(reqId),
      );
    },
    [state.activeInsurances],
  );

  /** Compute score when game is complete */
  const score: InsuranceShieldScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const totalEvents = insuranceShieldConfig.events.length;
    let eventsFullyBlocked = 0;
    let eventsMissed = 0;

    for (const event of insuranceShieldConfig.events) {
      const covered = event.requiredInsurance.every((reqId) =>
        state.activeInsurances.includes(reqId),
      );
      if (covered) eventsFullyBlocked++;
      else eventsMissed++;
    }

    const totalAnnualPremiums = state.totalPremiums * 12;
    const netSavings = state.savingsHealth - totalAnnualPremiums;
    const duplicatesFound = duplicates.length;

    const { grade, gradeLabel } = computeGrade(
      eventsFullyBlocked,
      totalEvents,
      duplicatesFound,
      state.savingsHealth,
    );

    return {
      grade,
      gradeLabel,
      netSavings,
      duplicatesFound,
      eventsFullyBlocked,
      eventsMissed,
      totalAnnualPremiums,
      totalDamageBlocked: state.totalBlocked,
      totalDamageReceived: state.totalDamage,
    };
  }, [state.isComplete, state.activeInsurances, state.totalPremiums, state.savingsHealth, state.totalBlocked, state.totalDamage, duplicates.length]);

  /** Reset game to initial state */
  const resetGame = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    config: insuranceShieldConfig,
    currentEvent,
    budgetRemaining,
    duplicates,
    duplicatesWastedAmount,
    toggleInsurance,
    startEvents,
    processEvent,
    isEventCovered,
    score,
    resetGame,
  };
}
