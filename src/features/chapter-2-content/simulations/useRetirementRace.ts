import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type { RetirementRaceState, RetirementRaceScore } from './retirementRaceTypes';
import { retirementRaceConfig } from './retirementRaceData';

const DEFAULT_SPEED = 200;

/**
 * Total years from earliest start age to retirement.
 * Neta starts at 22, retirement at 67 → 45 years.
 */
const TOTAL_YEARS = retirementRaceConfig.retirementAge - retirementRaceConfig.runners[0].startAge;

/**
 * Offset in years between the two runners' start ages.
 * Ori starts 13 years after Neta → Ori's yearData[0] aligns with global year 13.
 */
const RUNNER_OFFSET =
  retirementRaceConfig.runners[1].startAge - retirementRaceConfig.runners[0].startAge;

/**
 * Get the balance for a runner at a given global year index (0-based from earliest start).
 * Returns 0 if the runner hasn't started saving yet.
 */
function getBalanceAtYear(runnerIndex: number, globalYear: number): number {
  const runner = retirementRaceConfig.runners[runnerIndex];
  if (runnerIndex === 0) {
    // First runner (Neta) — direct mapping
    return globalYear > 0 ? (runner.yearData[globalYear - 1] ?? 0) : 0;
  }
  // Second runner (Ori) — offset by RUNNER_OFFSET years
  const localYear = globalYear - RUNNER_OFFSET;
  return localYear > 0 ? (runner.yearData[localYear - 1] ?? 0) : 0;
}

/**
 * Find the overtake year — when runner 0 (Neta) first exceeds runner 1 (Ori).
 * Only check from after runner 1 has started (since before that Neta trivially leads).
 */
function findOvertakeYear(): number | null {
  for (let y = RUNNER_OFFSET + 1; y <= TOTAL_YEARS; y++) {
    const bal0 = getBalanceAtYear(0, y);
    const bal1 = getBalanceAtYear(1, y);
    if (bal0 > bal1) return y;
  }
  return null;
}

const overtakeYear = findOvertakeYear();

const INITIAL_STATE: RetirementRaceState = {
  currentYear: 0,
  runners: retirementRaceConfig.runners.map((r) => ({ ...r, currentBalance: 0 })),
  isPlaying: false,
  playSpeed: DEFAULT_SPEED,
  isComplete: false,
  overtakeYear,
};

export function useRetirementRace() {
  const [state, setState] = useState<RetirementRaceState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Advance by one year */
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextYear = prev.currentYear + 1;
      const isComplete = nextYear >= TOTAL_YEARS;

      return {
        ...prev,
        currentYear: nextYear,
        runners: prev.runners.map((r, i) => ({
          ...r,
          currentBalance: getBalanceAtYear(i, nextYear),
        })),
        isPlaying: isComplete ? false : prev.isPlaying,
        isComplete,
      };
    });
  }, []);

  /** Start auto-play */
  const play = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      return { ...prev, isPlaying: true };
    });
  }, []);

  /** Pause auto-play */
  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  /** Reset to initial state */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  /** Jump to a specific year */
  const setYear = useCallback((year: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_YEARS, year));
    setState((prev) => ({
      ...prev,
      currentYear: clamped,
      runners: prev.runners.map((r, i) => ({
        ...r,
        currentBalance: getBalanceAtYear(i, clamped),
      })),
      isPlaying: false,
      isComplete: clamped >= TOTAL_YEARS,
    }));
  }, []);

  /** Change playback speed */
  const setSpeed = useCallback((ms: number) => {
    setState((prev) => ({ ...prev, playSpeed: ms }));
  }, []);

  /** Auto-play interval management */
  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(tick, state.playSpeed);
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
  }, [state.isPlaying, state.playSpeed, tick]);

  /** Compute score when race is complete */
  const score: RetirementRaceScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const runners = retirementRaceConfig.runners;
    const finalBalances = runners.map((_, i) => getBalanceAtYear(i, TOTAL_YEARS));
    const totalDeposited = runners.map((r) => {
      const years = retirementRaceConfig.retirementAge - r.startAge;
      return r.monthlyDeposit * 12 * years;
    });
    const totalWithEmployer = runners.map((r) => {
      const years = retirementRaceConfig.retirementAge - r.startAge;
      return (r.monthlyDeposit + r.employerMatch) * 12 * years;
    });

    const maxBal = Math.max(...finalBalances);
    const minBal = Math.min(...finalBalances);
    const multiplier = minBal > 0 ? Math.round((maxBal / minBal) * 10) / 10 : 0;

    return {
      finalBalances,
      totalDeposited,
      totalWithEmployer,
      multiplier,
      overtakeYear,
    };
  }, [state.isComplete]);

  return {
    state,
    config: retirementRaceConfig,
    totalYears: TOTAL_YEARS,
    play,
    pause,
    reset,
    setYear,
    setSpeed,
    score,
  };
}
