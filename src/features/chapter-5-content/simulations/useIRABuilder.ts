/**
 * SIM 5-31: בונה ה-IRA (IRA Builder), Module 5-31
 * Hook: sliders for contribution, return, tax rates → auto-play 30 years
 * → compare Traditional vs Roth IRA after-tax values → grade by winner prediction.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type { IRAType, IRAState, IRAScore } from './iraBuilderTypes';
import { IRA_CONFIG, SLIDER_RANGES } from './iraBuilderData';

// ── Constants ──────────────────────────────────────────────────────────

/** Auto-advance interval: one year every 750ms */
const YEAR_INTERVAL_MS = 750;

const TOTAL_YEARS = IRA_CONFIG.years; // 30

// ── Helpers ─────────────────────────────────────────────────────────────

/** Compute Traditional IRA gross balances year-by-year (pre-tax contribution, tax-free growth). */
function computeTraditionalByYear(
  contribution: number,
  rate: number,
  yearCount: number,
): number[] {
  const balances: number[] = [0];
  let balance = 0;
  for (let i = 0; i < yearCount; i++) {
    balance = (balance + contribution) * (1 + rate);
    balances.push(Math.round(balance));
  }
  return balances;
}

/** Compute Roth IRA gross balances year-by-year (post-tax contribution, tax-free growth). */
function computeRothByYear(
  contribution: number,
  taxNow: number,
  rate: number,
  yearCount: number,
): number[] {
  const postTaxContribution = contribution * (1 - taxNow);
  const balances: number[] = [0];
  let balance = 0;
  for (let i = 0; i < yearCount; i++) {
    balance = (balance + postTaxContribution) * (1 + rate);
    balances.push(Math.round(balance));
  }
  return balances;
}

/**
 * Grade based on whether user correctly identified the winner IRA type.
 * - Correct pick → S
 * - Wrong pick with close margins (<5% difference) → B (understandable)
 * - Wrong pick with moderate margin (<15%) → C
 * - Wrong pick with large margin → F
 */
function computeGrade(
  selectedType: IRAType,
  actualWinner: IRAType,
  traditionalNet: number,
  rothNet: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (selectedType === actualWinner) {
    return { grade: 'S', gradeLabel: 'מצוין!' };
  }

  // Wrong pick, mitigate if the options were very close
  const maxNet = Math.max(traditionalNet, rothNet);
  const differencePercent =
    maxNet > 0 ? (Math.abs(traditionalNet - rothNet) / maxNet) * 100 : 0;

  if (differencePercent < 5) return { grade: 'B', gradeLabel: 'טוב' };
  if (differencePercent < 15) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Slider params ref shape ─────────────────────────────────────────────

interface SliderParams {
  contribution: number;
  returnRate: number;
  taxNow: number;
  taxRetirement: number;
}

function defaultParams(): SliderParams {
  return {
    contribution: SLIDER_RANGES.contribution.default,
    returnRate: SLIDER_RANGES.returnRate.default,
    taxNow: SLIDER_RANGES.taxNow.default,
    taxRetirement: SLIDER_RANGES.taxRetirement.default,
  };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): IRAState {
  return {
    selectedType: null,
    annualContribution: SLIDER_RANGES.contribution.default,
    investmentReturn: SLIDER_RANGES.returnRate.default,
    taxRateNow: SLIDER_RANGES.taxNow.default,
    taxRateRetirement: SLIDER_RANGES.taxRetirement.default,
    traditionalByYear: [0],
    rothByYear: [0],
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useIRABuilder() {
  const [state, setState] = useState<IRAState>(createInitialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentYear, setCurrentYear] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(0);

  // Ref mirrors slider values so interval callback reads latest without stale closure
  const paramsRef = useRef<SliderParams>(defaultParams());

  // ── Slider updates ────────────────────────────────────────────────

  const updateContribution = useCallback((value: number) => {
    paramsRef.current.contribution = value;
    setState((prev) => ({ ...prev, annualContribution: value }));
  }, []);

  const updateReturn = useCallback((value: number) => {
    paramsRef.current.returnRate = value;
    setState((prev) => ({ ...prev, investmentReturn: value }));
  }, []);

  const updateTaxNow = useCallback((value: number) => {
    paramsRef.current.taxNow = value;
    setState((prev) => ({ ...prev, taxRateNow: value }));
  }, []);

  const updateTaxRetirement = useCallback((value: number) => {
    paramsRef.current.taxRetirement = value;
    setState((prev) => ({ ...prev, taxRateRetirement: value }));
  }, []);

  // ── Type selection (user's prediction) ────────────────────────────

  const selectType = useCallback((type: IRAType) => {
    setState((prev) => (prev.isComplete ? prev : { ...prev, selectedType: type }));
  }, []);

  // ── Play / Pause ──────────────────────────────────────────────────

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Auto-advance interval ────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const nextYear = yearRef.current + 1;

        if (nextYear > TOTAL_YEARS) {
          // Stop immediately, don't wait for state propagation
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          setState((prev) => ({ ...prev, isComplete: true }));
          return;
        }

        yearRef.current = nextYear;
        const { contribution, returnRate, taxNow } = paramsRef.current;

        const traditionalBal = computeTraditionalByYear(
          contribution,
          returnRate,
          nextYear,
        );
        const rothBal = computeRothByYear(
          contribution,
          taxNow,
          returnRate,
          nextYear,
        );

        setCurrentYear(nextYear);
        setState((prev) => ({
          ...prev,
          traditionalByYear: traditionalBal,
          rothByYear: rothBal,
        }));
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
  }, [isPlaying]);

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pause();
    yearRef.current = 0;
    setCurrentYear(0);
    paramsRef.current = defaultParams();
    setState(createInitialState());
  }, [pause]);

  // ── Score ──────────────────────────────────────────────────────────

  const score: IRAScore | null = useMemo(() => {
    if (!state.isComplete || !state.selectedType) return null;

    const { contribution, returnRate, taxNow, taxRetirement } =
      paramsRef.current;

    const traditionalBal = computeTraditionalByYear(
      contribution,
      returnRate,
      TOTAL_YEARS,
    );
    const rothBal = computeRothByYear(
      contribution,
      taxNow,
      returnRate,
      TOTAL_YEARS,
    );

    const traditionalGross = traditionalBal[traditionalBal.length - 1];
    const rothGross = rothBal[rothBal.length - 1];

    // Traditional: taxed at retirement rate on withdrawal
    const traditionalNet = Math.round(
      traditionalGross * (1 - taxRetirement),
    );
    // Roth: no tax on withdrawal (contributions were post-tax)
    const rothNet = rothGross;

    const winner: IRAType =
      rothNet >= traditionalNet ? 'roth' : 'traditional';
    const differenceNet = Math.abs(traditionalNet - rothNet);

    const gradeInfo = computeGrade(
      state.selectedType,
      winner,
      traditionalNet,
      rothNet,
    );

    return {
      traditionalGross,
      traditionalNet,
      rothGross,
      rothNet,
      winner,
      differenceNet,
      ...gradeInfo,
    };
  }, [state.isComplete, state.selectedType]);

  return {
    state,
    isPlaying,
    currentYear,
    totalYears: TOTAL_YEARS,
    config: IRA_CONFIG,
    score,
    selectType,
    updateContribution,
    updateReturn,
    updateTaxNow,
    updateTaxRetirement,
    play,
    pause,
    reset,
  };
}
