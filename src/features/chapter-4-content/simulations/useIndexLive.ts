/**
 * SIM 20: מדד לייב (Index Live, ‎S&P‎ 500 Time Machine), Module 4-20
 * Hook: slider selects start year → compute value from start year to 2025.
 * Finds best/worst possible start years for context.
 */

import { useState, useCallback, useMemo } from 'react';

import type { IndexLiveState, IndexLiveScore } from './indexLiveTypes';
import { indexLiveConfig, SP500_ANNUAL_RETURNS } from './indexLiveData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calculate final value of initialInvestment from startYear to 2025 using annual returns. */
function computeValue(startYear: number, initialInvestment: number): number {
  let value = initialInvestment;
  for (let y = startYear; y <= 2025; y++) {
    const ret = SP500_ANNUAL_RETURNS[y];
    if (ret !== undefined) {
      value = value * (1 + ret);
    }
  }
  return Math.round(value);
}

/** Calculate total return % from startYear to 2025. */
function computeTotalReturn(startYear: number): number {
  let cumulative = 1;
  for (let y = startYear; y <= 2025; y++) {
    const ret = SP500_ANNUAL_RETURNS[y];
    if (ret !== undefined) {
      cumulative *= 1 + ret;
    }
  }
  return Math.round((cumulative - 1) * 10000) / 100; // e.g. 345.67%
}

/** Average annual return (geometric) from startYear to 2025. */
function computeAverageAnnual(startYear: number): number {
  const years = 2025 - startYear + 1;
  if (years <= 0) return 0;

  let cumulative = 1;
  for (let y = startYear; y <= 2025; y++) {
    const ret = SP500_ANNUAL_RETURNS[y];
    if (ret !== undefined) {
      cumulative *= 1 + ret;
    }
  }

  // Geometric mean
  const avgAnnual = Math.pow(cumulative, 1 / years) - 1;
  return Math.round(avgAnnual * 1000) / 10; // e.g. 10.3%
}

/** Build year-by-year value path for chart display. */
function computeYearPath(
  startYear: number,
  initialInvestment: number,
): Array<{ year: number; value: number }> {
  const path: Array<{ year: number; value: number }> = [];
  let value = initialInvestment;
  path.push({ year: startYear, value: Math.round(value) });

  for (let y = startYear; y <= 2025; y++) {
    const ret = SP500_ANNUAL_RETURNS[y];
    if (ret !== undefined) {
      value = value * (1 + ret);
      path.push({ year: y + 1, value: Math.round(value) });
    }
  }

  return path;
}

/** Find best and worst possible start years within the allowed range. */
function findBestWorstStartYears(
  minYear: number,
  maxYear: number,
): { best: number; worst: number } {
  let bestYear = minYear;
  let worstYear = minYear;
  let bestReturn = computeTotalReturn(minYear);
  let worstReturn = bestReturn;

  for (let y = minYear + 1; y <= maxYear; y++) {
    const ret = computeTotalReturn(y);
    if (ret > bestReturn) {
      bestReturn = ret;
      bestYear = y;
    }
    if (ret < worstReturn) {
      worstReturn = ret;
      worstYear = y;
    }
  }

  return { best: bestYear, worst: worstYear };
}

// ── Pre-compute best/worst (they don't change) ─────────────────────────

const { best: BEST_START, worst: WORST_START } = findBestWorstStartYears(
  indexLiveConfig.startYearRange[0],
  indexLiveConfig.startYearRange[1],
);

// ── Initial state factory ──────────────────────────────────────────────

const DEFAULT_START_YEAR = 2000;

function createInitialState(): IndexLiveState {
  const investment = indexLiveConfig.initialInvestment;

  return {
    selectedStartYear: DEFAULT_START_YEAR,
    currentEndYear: 2025,
    investedValue: investment,
    currentValue: computeValue(DEFAULT_START_YEAR, investment),
    totalReturn: computeTotalReturn(DEFAULT_START_YEAR),
    bestStartYear: BEST_START,
    worstStartYear: WORST_START,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useIndexLive() {
  const [state, setState] = useState<IndexLiveState>(createInitialState);
  const investment = indexLiveConfig.initialInvestment;

  // ── Select start year ──────────────────────────────────────────────

  /** Set selected start year. Recomputes value, return, etc. */
  const setStartYear = useCallback(
    (year: number) => {
      const [minY, maxY] = indexLiveConfig.startYearRange;
      const clamped = Math.max(minY, Math.min(maxY, Math.round(year)));

      setState((prev) => ({
        ...prev,
        selectedStartYear: clamped,
        currentValue: computeValue(clamped, investment),
        totalReturn: computeTotalReturn(clamped),
      }));
    },
    [investment],
  );

  // ── Year path for chart ────────────────────────────────────────────

  const yearPath = useMemo(
    () => computeYearPath(state.selectedStartYear, investment),
    [state.selectedStartYear, investment],
  );

  // ── Years invested ─────────────────────────────────────────────────

  const yearsInvested = useMemo(
    () => 2025 - state.selectedStartYear + 1,
    [state.selectedStartYear],
  );

  // ── Average annual return ──────────────────────────────────────────

  const averageAnnualReturn = useMemo(
    () => computeAverageAnnual(state.selectedStartYear),
    [state.selectedStartYear],
  );

  // ── Best/worst context values ──────────────────────────────────────

  const bestValue = useMemo(
    () => computeValue(BEST_START, investment),
    [investment],
  );

  const worstValue = useMemo(
    () => computeValue(WORST_START, investment),
    [investment],
  );

  // ── Complete ──────────────────────────────────────────────────────

  const complete = useCallback(() => {
    setState((prev) => ({ ...prev, isComplete: true }));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Score ──────────────────────────────────────────────────────────

  const score: IndexLiveScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    return {
      selectedReturn: state.totalReturn,
      bestReturn: computeTotalReturn(BEST_START),
      worstReturn: computeTotalReturn(WORST_START),
      yearsInvested,
      averageAnnualReturn,
    };
  }, [state.isComplete, state.totalReturn, yearsInvested, averageAnnualReturn]);

  return {
    state,
    config: indexLiveConfig,
    yearPath,
    yearsInvested,
    averageAnnualReturn,
    bestValue,
    worstValue,
    score,
    setStartYear,
    complete,
    reset,
  };
}
