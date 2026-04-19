/**
 * SIM 23: עץ הדיבידנדים (Dividend Tree), Module 4-23
 * Hook: simulate both "Eat" (cash out dividends) and "Plant" (DRIP reinvest)
 * paths in parallel over 20 years with auto-play support.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  DividendTreeState,
  DividendTreeScore,
} from './dividendTreeTypes';
import {
  EAT_PATH,
  PLANT_PATH,
  dividendTreeConfig,
} from './dividendTreeData';

// ── Auto-play config ─────────────────────────────────────────────────────

/** Default: advance 1 year every 750ms (20 years in 15 seconds) */
const DEFAULT_PLAY_INTERVAL_MS = 750;

// ── Initial state factory ────────────────────────────────────────────────

function createInitialState(): DividendTreeState {
  return {
    currentYear: 0,
    eatTree: {
      value: dividendTreeConfig.initialInvestment,
      totalDividendsTaken: 0,
    },
    plantTree: {
      value: dividendTreeConfig.initialInvestment,
    },
    isPlaying: false,
    isComplete: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useDividendTree() {
  const [state, setState] = useState<DividendTreeState>(createInitialState);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(0);

  // ── Advance one year ─────────────────────────────────────────────────

  const advanceYear = useCallback(() => {
    const nextYear = yearRef.current + 1;
    if (nextYear > dividendTreeConfig.years) return;

    yearRef.current = nextYear;
    const eatData = EAT_PATH[nextYear - 1]; // 0-indexed array, 1-indexed years
    const plantData = PLANT_PATH[nextYear - 1];

    setState((prev) => {
      const newTotalDividends = prev.eatTree.totalDividendsTaken + eatData.dividendAmount;

      const newState: DividendTreeState = {
        ...prev,
        currentYear: nextYear,
        eatTree: {
          value: eatData.treeValue,
          totalDividendsTaken: newTotalDividends,
        },
        plantTree: {
          value: plantData.treeValue,
        },
      };

      // Auto-complete at final year
      if (nextYear >= dividendTreeConfig.years) {
        newState.isPlaying = false;
        newState.isComplete = true;
      }

      return newState;
    });
  }, []);

  // ── Auto-play controls ───────────────────────────────────────────────

  /** Start auto-play: advance 1 year at configurable speed. */
  const startPlay = useCallback((intervalMs: number = DEFAULT_PLAY_INTERVAL_MS) => {
    if (yearRef.current >= dividendTreeConfig.years) return;
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  /** Stop auto-play. */
  const stopPlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
  }, []);

  // Manage auto-play interval
  useEffect(() => {
    if (state.isPlaying) {
      playRef.current = setInterval(() => {
        const nextYear = yearRef.current + 1;
        if (nextYear > dividendTreeConfig.years) {
          setState((prev) => ({ ...prev, isPlaying: false, isComplete: true }));
          return;
        }

        yearRef.current = nextYear;
        const eatData = EAT_PATH[nextYear - 1];
        const plantData = PLANT_PATH[nextYear - 1];

        setState((prev) => ({
          ...prev,
          currentYear: nextYear,
          eatTree: {
            value: eatData.treeValue,
            totalDividendsTaken: prev.eatTree.totalDividendsTaken + eatData.dividendAmount,
          },
          plantTree: {
            value: plantData.treeValue,
          },
          isPlaying: nextYear < dividendTreeConfig.years,
          isComplete: nextYear >= dividendTreeConfig.years,
        }));
      }, DEFAULT_PLAY_INTERVAL_MS);
    } else if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }

    return () => {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [state.isPlaying]);

  // ── Complete (manual) ────────────────────────────────────────────────

  /** Skip to end, set final year state immediately. */
  const complete = useCallback(() => {
    stopPlay();
    yearRef.current = dividendTreeConfig.years;

    // Sum all eat dividends
    const totalDividends = EAT_PATH.reduce((sum, yr) => sum + yr.dividendAmount, 0);
    const finalEatValue = EAT_PATH[EAT_PATH.length - 1].treeValue;
    const finalPlantValue = PLANT_PATH[PLANT_PATH.length - 1].treeValue;

    setState({
      currentYear: dividendTreeConfig.years,
      eatTree: {
        value: finalEatValue,
        totalDividendsTaken: totalDividends,
      },
      plantTree: {
        value: finalPlantValue,
      },
      isPlaying: false,
      isComplete: true,
    });
  }, [stopPlay]);

  /** Reset to initial state. */
  const reset = useCallback(() => {
    stopPlay();
    yearRef.current = 0;
    setState(createInitialState());
  }, [stopPlay]);

  // ── Computed values ──────────────────────────────────────────────────

  /** Year-by-year eat path up to current year (for chart rendering). */
  const eatHistory = useMemo(
    () => EAT_PATH.slice(0, state.currentYear),
    [state.currentYear],
  );

  /** Year-by-year plant path up to current year (for chart rendering). */
  const plantHistory = useMemo(
    () => PLANT_PATH.slice(0, state.currentYear),
    [state.currentYear],
  );

  /** Current year's eat dividend amount (0 if year 0). */
  const currentEatDividend = useMemo(
    () => (state.currentYear > 0 ? EAT_PATH[state.currentYear - 1].dividendAmount : 0),
    [state.currentYear],
  );

  /** Current year's plant dividend amount (0 if year 0). */
  const currentPlantDividend = useMemo(
    () => (state.currentYear > 0 ? PLANT_PATH[state.currentYear - 1].dividendAmount : 0),
    [state.currentYear],
  );

  /** Score: only available when simulation is complete. */
  const score: DividendTreeScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const eatTotal = state.eatTree.value + state.eatTree.totalDividendsTaken;
    const plantTotal = state.plantTree.value;

    return {
      eatTotal,
      plantTotal,
      difference: plantTotal - eatTotal,
    };
  }, [state.isComplete, state.eatTree.value, state.eatTree.totalDividendsTaken, state.plantTree.value]);

  return {
    state,
    config: dividendTreeConfig,
    eatHistory,
    plantHistory,
    currentEatDividend,
    currentPlantDividend,
    score,
    advanceYear,
    startPlay,
    stopPlay,
    complete,
    reset,
  };
}
