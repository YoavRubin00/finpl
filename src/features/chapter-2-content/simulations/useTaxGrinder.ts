import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type { TaxGrinderState, TaxGrinderScore, TaxGrinderGrade } from './taxGrinderTypes';
import { taxGrinderConfig } from './taxGrinderData';

const DEFAULT_SPEED = 400;

/**
 * Get net balance for a track at a given year (1-based index).
 * Net = deposits + gains - taxPaid.
 */
function getNetBalance(trackIndex: number, year: number): number {
  const track = taxGrinderConfig.tracks[trackIndex];
  if (year < 1 || year > track.deposits.length) return 0;
  const idx = year - 1;
  return track.deposits[idx] + track.gains[idx] - track.taxPaid[idx];
}

/**
 * Build TaxGrinderState tracks for a given year.
 */
function buildTracksForYear(year: number) {
  return taxGrinderConfig.tracks.map((t, i) => ({
    ...t,
    netBalance: getNetBalance(i, year),
  }));
}

function createInitialState(): TaxGrinderState {
  return {
    currentYear: 0,
    tracks: taxGrinderConfig.tracks.map((t) => ({ ...t, netBalance: 0 })),
    difference: 0,
    taxSaved: 0,
    isPlaying: false,
    isComplete: false,
  };
}

const GRADE_MAP: { min: number; grade: TaxGrinderGrade; label: string }[] = [
  { min: 15, grade: 'S', label: 'מדהים!' },
  { min: 12, grade: 'A', label: 'מצוין' },
  { min: 9, grade: 'B', label: 'טוב' },
  { min: 6, grade: 'C', label: 'סביר' },
];

export function useTaxGrinder() {
  const [state, setState] = useState<TaxGrinderState>(createInitialState);
  const [selectedYears, setSelectedYears] = useState(taxGrinderConfig.defaultYears);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Advance by one year */
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextYear = prev.currentYear + 1;
      const tracks = buildTracksForYear(nextYear);
      const isComplete = nextYear >= selectedYears;
      const difference = tracks[1].netBalance - tracks[0].netBalance;
      const taxSaved = taxGrinderConfig.tracks[0].taxPaid[nextYear - 1] ?? 0;

      return {
        currentYear: nextYear,
        tracks,
        difference,
        taxSaved,
        isPlaying: isComplete ? false : prev.isPlaying,
        isComplete,
      };
    });
  }, [selectedYears]);

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
    setState(createInitialState());
  }, []);

  /** Jump to a specific year */
  const setYear = useCallback(
    (year: number) => {
      const clamped = Math.max(0, Math.min(selectedYears, year));
      if (clamped === 0) {
        setState(createInitialState());
        return;
      }
      const tracks = buildTracksForYear(clamped);
      const difference = tracks[1].netBalance - tracks[0].netBalance;
      const taxSaved = taxGrinderConfig.tracks[0].taxPaid[clamped - 1] ?? 0;

      setState({
        currentYear: clamped,
        tracks,
        difference,
        taxSaved,
        isPlaying: false,
        isComplete: clamped >= selectedYears,
      });
    },
    [selectedYears],
  );

  /** Change simulation length (year slider) */
  const changeYears = useCallback(
    (years: number) => {
      const clamped = Math.max(taxGrinderConfig.minYears, Math.min(taxGrinderConfig.maxYears, years));
      setSelectedYears(clamped);
      // Reset simulation when slider changes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState(createInitialState());
    },
    [],
  );

  /** Auto-play interval management */
  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(tick, DEFAULT_SPEED);
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
  }, [state.isPlaying, tick]);

  /** Compute score when simulation is complete */
  const score: TaxGrinderScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const yearIdx = selectedYears - 1;
    const tracks = taxGrinderConfig.tracks;
    const finalBalances = tracks.map((_, i) => getNetBalance(i, selectedYears));
    const totalDeposited = tracks.map((t) => t.monthlyDeposit * 12 * selectedYears);
    const totalTaxPaid = tracks[0].taxPaid[yearIdx] ?? 0;
    const totalEmployerBonus = tracks[1].employerBonus * 12 * selectedYears;
    const netDifference = finalBalances[1] - finalBalances[0];
    const taxSaved = totalTaxPaid; // hishtalmut pays 0 tax, so saved = regular's tax

    // Grade based on years explored (longer = better understanding)
    let grade: TaxGrinderGrade = 'F';
    let gradeLabel = 'צריך שיפור';
    for (const entry of GRADE_MAP) {
      if (selectedYears >= entry.min) {
        grade = entry.grade;
        gradeLabel = entry.label;
        break;
      }
    }

    return {
      grade,
      gradeLabel,
      finalBalances,
      totalDeposited,
      totalEmployerBonus,
      totalTaxPaid,
      netDifference,
      taxSaved,
    };
  }, [state.isComplete, selectedYears]);

  return {
    state,
    config: taxGrinderConfig,
    selectedYears,
    play,
    pause,
    reset,
    setYear,
    changeYears,
    score,
  };
}
