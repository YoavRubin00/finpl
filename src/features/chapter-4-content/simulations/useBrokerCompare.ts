/**
 * SIM 4-26: השוואת ברוקרים (Broker Compare), Module 4-26
 * Hook: reactive broker fee calculation, ranking, and grade.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  UserProfile,
  BrokerCompareState,
  BrokerCompareScore,
} from './brokerCompareTypes';
import { brokerCompareConfig, DEFAULT_PROFILE, calcYearlyCost } from './brokerCompareData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Compute yearly costs for all brokers given a profile. */
function computeAllCosts(profile: UserProfile): Record<string, number> {
  const costs: Record<string, number> = {};
  for (const broker of brokerCompareConfig.brokers) {
    costs[broker.id] = Math.round(calcYearlyCost(broker, profile));
  }
  return costs;
}

/** Rank broker IDs from cheapest to most expensive. */
function rankBrokers(costs: Record<string, number>): string[] {
  return Object.entries(costs)
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id);
}

/** Grade based on which broker the user chose relative to ranking. */
function computeGrade(
  selectedBroker: string,
  ranked: string[],
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  const position = ranked.indexOf(selectedBroker);
  if (position === 0) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (position === 1) return { grade: 'B', gradeLabel: 'טוב' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): BrokerCompareState {
  const profile = { ...DEFAULT_PROFILE };
  return {
    profile,
    yearlyCosts: computeAllCosts(profile),
    selectedBroker: null,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useBrokerCompare() {
  const [state, setState] = useState<BrokerCompareState>(createInitialState);

  // ── Derived: ranked broker IDs (cheapest first) ─────────────────────

  const ranked = useMemo(() => rankBrokers(state.yearlyCosts), [state.yearlyCosts]);

  const cheapestId = ranked[0];

  // ── Update profile → recalculate costs ──────────────────────────────

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextProfile: UserProfile = { ...prev.profile, ...partial };
      return {
        ...prev,
        profile: nextProfile,
        yearlyCosts: computeAllCosts(nextProfile),
      };
    });
  }, []);

  // ── Select broker → complete ────────────────────────────────────────

  const selectBroker = useCallback((brokerId: string) => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      return {
        ...prev,
        selectedBroker: brokerId,
        isComplete: true,
      };
    });
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Score ───────────────────────────────────────────────────────────

  const score: BrokerCompareScore | null = useMemo(() => {
    if (!state.isComplete || !state.selectedBroker) return null;

    const currentRanked = rankBrokers(state.yearlyCosts);
    const cheapest = currentRanked[0];
    const gradeInfo = computeGrade(state.selectedBroker, currentRanked);

    const cheapestCost = state.yearlyCosts[cheapest] ?? 0;
    const selectedCost = state.yearlyCosts[state.selectedBroker] ?? 0;
    const yearlyDifference = selectedCost - cheapestCost;
    const totalSavings10Y = yearlyDifference * 10;

    // Find the broker name for the cheapest
    const cheapestBroker = brokerCompareConfig.brokers.find((b) => b.id === cheapest)?.name ?? cheapest;

    return {
      cheapestBroker,
      yearlyDifference,
      totalSavings10Y,
      ...gradeInfo,
    };
  }, [state.isComplete, state.selectedBroker, state.yearlyCosts]);

  return {
    state,
    config: brokerCompareConfig,
    ranked,
    cheapestId,
    score,
    updateProfile,
    selectBroker,
    reset,
  };
}
