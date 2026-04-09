/**
 * SIM: מחשבון מרווח ביטחון (Margin of Safety Calculator)
 * Hook: select stocks, compute Graham-style valuation, grade results.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  StockInput,
  SafetyGrade,
  GrahamValuation,
  CriterionResult,
} from './marginSafetyTypes';
import { EXAMPLE_STOCKS } from './marginSafetyData';

// ── Helpers ──────────────────────────────────────────────────────────────

function buildCriteria(
  pe: number,
  pb: number,
  stock: StockInput,
): CriterionResult[] {
  return [
    {
      label: 'מכפיל רווח (P/E)',
      value: pe.toFixed(1),
      passed: pe < 15,
      threshold: 'מתחת ל-15',
    },
    {
      label: 'מכפיל הון (P/B)',
      value: pb.toFixed(2),
      passed: pb < 1.5,
      threshold: 'מתחת ל-1.5',
    },
    {
      label: 'P/E × P/B',
      value: (pe * pb).toFixed(1),
      passed: pe * pb < 22.5,
      threshold: 'מתחת ל-22.5',
    },
    {
      label: 'תשואת דיבידנד',
      value: `${stock.dividendYield}%`,
      passed: stock.dividendYield > 0,
      threshold: 'מעל 0%',
    },
    {
      label: 'חוב/הון',
      value: stock.debtToEquity.toFixed(2),
      passed: stock.debtToEquity < 1,
      threshold: 'מתחת ל-1',
    },
    {
      label: 'שנות רווחיות',
      value: `${stock.yearsProfitable}`,
      passed: stock.yearsProfitable >= 10,
      threshold: '10 שנים לפחות',
    },
  ];
}

function computeGrade(marginOfSafety: number): SafetyGrade {
  if (marginOfSafety > 30) return 'green';
  if (marginOfSafety >= 0) return 'yellow';
  return 'red';
}

function computeValuation(stock: StockInput): GrahamValuation {
  const pe = stock.price / stock.eps;
  const pb = stock.price / stock.bookValue;
  const grahamNumber = Math.sqrt(22.5 * stock.eps * stock.bookValue);
  const intrinsicValue =
    (stock.eps * (8.5 + 2 * stock.growthRate) * 4.4) / stock.aaaYield;
  const marginOfSafety =
    ((intrinsicValue - stock.price) / intrinsicValue) * 100;
  const grade = computeGrade(marginOfSafety);
  const criteriaResults = buildCriteria(pe, pb, stock);

  return {
    pe,
    pb,
    grahamNumber: Math.round(grahamNumber * 100) / 100,
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    marginOfSafety: Math.round(marginOfSafety * 10) / 10,
    grade,
    criteriaResults,
  };
}

// ── Grade → numeric score mapping (for onComplete) ──────────────────────

function gradeToScore(grade: SafetyGrade): number {
  switch (grade) {
    case 'green':
      return 100;
    case 'yellow':
      return 60;
    case 'red':
      return 30;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────

interface MarginSafetyState {
  selectedStock: StockInput | null;
  completedIds: Set<string>;
}

export function useMarginSafety() {
  const [state, setState] = useState<MarginSafetyState>({
    selectedStock: null,
    completedIds: new Set(),
  });

  const selectStock = useCallback((stock: StockInput) => {
    setState((prev) => ({
      ...prev,
      selectedStock: stock,
    }));
  }, []);

  const valuation: GrahamValuation | null = useMemo(() => {
    if (!state.selectedStock) return null;
    return computeValuation(state.selectedStock);
  }, [state.selectedStock]);

  const markCompleted = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedStock) return prev;
      const next = new Set(prev.completedIds);
      next.add(prev.selectedStock.id);
      return { ...prev, completedIds: next };
    });
  }, []);

  const allComplete = state.completedIds.size >= EXAMPLE_STOCKS.length;

  /** Skip to summary — mark all remaining as completed */
  const skipToSummary = useCallback(() => {
    setState((prev) => {
      const next = new Set(prev.completedIds);
      for (const s of EXAMPLE_STOCKS) next.add(s.id);
      return { ...prev, completedIds: next };
    });
  }, []);

  /** Average numeric score across all analysed stocks (uses only completed ones if not all). */
  const averageScore = useMemo(() => {
    if (state.completedIds.size === 0) return 0;
    let total = 0;
    let count = 0;
    for (const stock of EXAMPLE_STOCKS) {
      if (state.completedIds.has(stock.id)) {
        const v = computeValuation(stock);
        total += gradeToScore(v.grade);
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 0;
  }, [state.completedIds]);

  const reset = useCallback(() => {
    setState({ selectedStock: null, completedIds: new Set() });
  }, []);

  return {
    selectedStock: state.selectedStock,
    completedIds: state.completedIds,
    valuation,
    allComplete,
    averageScore,
    selectStock,
    markCompleted,
    skipToSummary,
    reset,
  };
}
