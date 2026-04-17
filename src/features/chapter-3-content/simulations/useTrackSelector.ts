/**
 * SIM 3-18: בוחר המסלולים (Track Selector) — Module 3-18
 * Hook: select track → play 30-year simulation → score comparison.
 * All 3 tracks computed simultaneously for visual comparison.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  TrackSelectorState,
  TrackSelectorScore,
} from './trackSelectorTypes';
import { trackSelectorConfig } from './trackSelectorData';

// ── Constants ──────────────────────────────────────────────────────────

/** Auto-advance interval: one year every 375ms (2× speed) */
const YEAR_INTERVAL_MS = 375;

const TOTAL_YEARS = trackSelectorConfig.marketYears.length;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Compute balances for all tracks up to a given year index (0 = initial only). */
function computeBalances(yearCount: number): Record<string, number[]> {
  const { tracks, marketYears, initialInvestment } = trackSelectorConfig;
  const result: Record<string, number[]> = {};

  for (const track of tracks) {
    const balances: number[] = [initialInvestment];
    let balance = initialInvestment;

    for (let i = 0; i < yearCount; i++) {
      const year = marketYears[i];
      const blendedReturn =
        year.stockReturn * track.stockPercent +
        year.bondReturn * track.bondPercent;
      balance = balance * (1 + blendedReturn - track.annualFeePercent);
      balances.push(Math.round(balance));
    }

    result[track.id] = balances;
  }

  return result;
}

/** Compute fees lost per track over N years (no-fee balance minus actual balance). */
function computeFeesLost(yearCount: number): Record<string, number> {
  const { tracks, marketYears, initialInvestment } = trackSelectorConfig;
  const result: Record<string, number> = {};

  for (const track of tracks) {
    let balance = initialInvestment;
    let noFeeBalance = initialInvestment;

    for (let i = 0; i < yearCount; i++) {
      const year = marketYears[i];
      const blendedReturn =
        year.stockReturn * track.stockPercent +
        year.bondReturn * track.bondPercent;
      noFeeBalance = noFeeBalance * (1 + blendedReturn);
      balance = balance * (1 + blendedReturn - track.annualFeePercent);
    }

    result[track.id] = Math.round(noFeeBalance - balance);
  }

  return result;
}

/** Grade based on chosen track's final balance vs best track. */
function computeGrade(
  selectedTrackId: string,
  finalBalances: Record<string, number>,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  const bestBalance = Math.max(...Object.values(finalBalances));
  const userBalance = finalBalances[selectedTrackId] ?? 0;
  const score = bestBalance > 0 ? (userBalance / bestBalance) * 100 : 0;

  if (score >= 90) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (score >= 75) return { grade: 'A', gradeLabel: 'מצוין' };
  if (score >= 55) return { grade: 'B', gradeLabel: 'טוב' };
  if (score >= 35) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): TrackSelectorState {
  return {
    selectedTrackId: null,
    yearIndex: 0,
    balanceByTrack: computeBalances(0),
    isPlaying: false,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useTrackSelector() {
  const [state, setState] = useState<TrackSelectorState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(0);

  // ── Select track ──────────────────────────────────────────────────

  const selectTrack = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedTrackId: id }));
  }, []);

  // ── Play / Pause ──────────────────────────────────────────────────

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

  // Manage auto-advance interval
  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(() => {
        const nextYear = yearRef.current + 1;

        if (nextYear > TOTAL_YEARS) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isComplete: true,
          }));
          return;
        }

        yearRef.current = nextYear;
        const balances = computeBalances(nextYear);

        setState((prev) => ({
          ...prev,
          yearIndex: nextYear,
          balanceByTrack: balances,
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
  }, [state.isPlaying]);

  // ── Reset ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pause();
    yearRef.current = 0;
    setState(createInitialState());
  }, [pause]);

  // ── Score ────────────────────────────────────────────────────────

  const score: TrackSelectorScore | null = useMemo(() => {
    if (!state.isComplete || !state.selectedTrackId) return null;

    const fullBalances = computeBalances(TOTAL_YEARS);
    const feesLost = computeFeesLost(TOTAL_YEARS);

    // Final balances (last entry in each track's array)
    const finalBalances: Record<string, number> = {};
    for (const [trackId, balances] of Object.entries(fullBalances)) {
      finalBalances[trackId] = balances[balances.length - 1];
    }

    // Best track by final balance
    let bestTrack = '';
    let bestBalance = 0;
    for (const [trackId, balance] of Object.entries(finalBalances)) {
      if (balance > bestBalance) {
        bestTrack = trackId;
        bestBalance = balance;
      }
    }

    const gradeInfo = computeGrade(state.selectedTrackId, finalBalances);

    return {
      balances: finalBalances,
      feesLost,
      bestTrack,
      ...gradeInfo,
    };
  }, [state.isComplete, state.selectedTrackId]);

  return {
    state,
    config: trackSelectorConfig,
    score,
    selectTrack,
    play,
    pause,
    reset,
  };
}
