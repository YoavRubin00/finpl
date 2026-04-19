/**
 * SIM 4-30: המרוץ נגד המדד (Index Race), Module 4-30
 * Hook: pick 5 stocks → race 10 years vs ‎S&P‎ 500 → score comparison.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type { IndexRaceState, IndexRaceScore } from './indexRaceTypes';
import {
  indexRaceConfig,
  PICK_COUNT,
  TOTAL_YEARS,
  INITIAL_INVESTMENT,
} from './indexRaceData';

// ── Constants ──────────────────────────────────────────────────────────

/** Auto-advance interval: one year every 750ms */
const YEAR_INTERVAL_MS = 750;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Compute equal-weight portfolio values from year 0 through yearCount. */
function computePortfolioValues(
  selectedIds: string[],
  yearCount: number,
): number[] {
  const stocks = indexRaceConfig.stockOptions.filter((s) =>
    selectedIds.includes(s.id),
  );
  const weight = stocks.length > 0 ? 1 / stocks.length : 0;
  const values: number[] = [INITIAL_INVESTMENT];
  let balance = INITIAL_INVESTMENT;

  for (let i = 0; i < yearCount; i++) {
    let blendedReturn = 0;
    for (const stock of stocks) {
      blendedReturn += stock.annualReturns[i] * weight;
    }
    balance = balance * (1 + blendedReturn);
    values.push(Math.round(balance));
  }

  return values;
}

/** Compute ‎S&P‎ 500 index values from year 0 through yearCount. */
function computeIndexValues(yearCount: number): number[] {
  const values: number[] = [INITIAL_INVESTMENT];
  let balance = INITIAL_INVESTMENT;

  for (let i = 0; i < yearCount; i++) {
    balance = balance * (1 + indexRaceConfig.indexReturns[i]);
    values.push(Math.round(balance));
  }

  return values;
}

/** Grade based on portfolio performance vs index. */
function computeGrade(
  portfolioFinal: number,
  indexFinal: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  const diffPercent =
    indexFinal > 0
      ? ((portfolioFinal - indexFinal) / indexFinal) * 100
      : 0;

  if (diffPercent >= 20) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (diffPercent > 0) return { grade: 'A', gradeLabel: 'מצוין' };
  if (diffPercent >= -5) return { grade: 'B', gradeLabel: 'טוב' };
  if (diffPercent >= -20) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): IndexRaceState {
  return {
    phase: 'pick',
    selectedStockIds: [],
    portfolioValueByYear: [INITIAL_INVESTMENT],
    indexValueByYear: [INITIAL_INVESTMENT],
    currentYear: 0,
    isPlaying: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useIndexRace() {
  const [state, setState] = useState<IndexRaceState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(0);

  // ── Toggle stock selection (pick phase) ────────────────────────────

  const toggleStock = useCallback((stockId: string) => {
    setState((prev) => {
      if (prev.phase !== 'pick') return prev;
      const isSelected = prev.selectedStockIds.includes(stockId);
      if (isSelected) {
        return {
          ...prev,
          selectedStockIds: prev.selectedStockIds.filter(
            (id) => id !== stockId,
          ),
        };
      }
      if (prev.selectedStockIds.length >= PICK_COUNT) return prev;
      return {
        ...prev,
        selectedStockIds: [...prev.selectedStockIds, stockId],
      };
    });
  }, []);

  // ── Start race ─────────────────────────────────────────────────────

  const startRace = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'pick' || prev.selectedStockIds.length !== PICK_COUNT)
        return prev;
      return { ...prev, phase: 'race', isPlaying: true };
    });
  }, []);

  // ── Play / Pause ───────────────────────────────────────────────────

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Auto-advance interval ─────────────────────────────────────────

  useEffect(() => {
    if (state.isPlaying && state.phase === 'race') {
      intervalRef.current = setInterval(() => {
        const nextYear = yearRef.current + 1;

        if (nextYear > TOTAL_YEARS) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            phase: 'complete' as const,
          }));
          return;
        }

        yearRef.current = nextYear;

        setState((prev) => {
          const portfolioValues = computePortfolioValues(
            prev.selectedStockIds,
            nextYear,
          );
          const indexValues = computeIndexValues(nextYear);

          return {
            ...prev,
            currentYear: nextYear,
            portfolioValueByYear: portfolioValues,
            indexValueByYear: indexValues,
          };
        });
      }, YEAR_INTERVAL_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isPlaying, state.phase]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pause();
    yearRef.current = 0;
    setState(createInitialState());
  }, [pause]);

  // ── Score ──────────────────────────────────────────────────────────

  const score: IndexRaceScore | null = useMemo(() => {
    if (state.phase !== 'complete') return null;

    const portfolioFinal =
      state.portfolioValueByYear[state.portfolioValueByYear.length - 1];
    const indexFinal =
      state.indexValueByYear[state.indexValueByYear.length - 1];

    const differencePercent =
      indexFinal > 0
        ? Math.round(((portfolioFinal - indexFinal) / indexFinal) * 100)
        : 0;

    const beatIndex = portfolioFinal > indexFinal;
    const gradeInfo = computeGrade(portfolioFinal, indexFinal);

    return {
      portfolioFinal,
      indexFinal,
      differencePercent,
      beatIndex,
      ...gradeInfo,
    };
  }, [state.phase, state.portfolioValueByYear, state.indexValueByYear]);

  return {
    state,
    config: indexRaceConfig,
    score,
    toggleStock,
    startRace,
    play,
    pause,
    reset,
  };
}
