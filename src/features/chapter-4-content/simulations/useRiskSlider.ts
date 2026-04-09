/**
 * SIM 19: סליידר הסיכון (Risk-Return Slider) — Module 4-19
 * Hook: slider value (0-100 stocks %) → compute blended returns,
 * final balance, max drawdown, best/worst year, average annual return.
 * Supports auto-sweep mode.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  AllocationMix,
  YearReturn,
  RiskSliderState,
  RiskLevel,
  RiskSliderScore,
} from './riskSliderTypes';
import {
  riskSliderConfig,
  RAW_STOCK_RETURNS,
  RAW_BOND_RETURNS,
} from './riskSliderData';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Build year-by-year history for an arbitrary stock percentage (0-100). */
function computeHistory(stockPercent: number): YearReturn[] {
  const stockFrac = stockPercent / 100;
  const bondFrac = 1 - stockFrac;
  let balance = riskSliderConfig.initialInvestment;

  return RAW_STOCK_RETURNS.map((stockRet, i) => {
    const bondRet = RAW_BOND_RETURNS[i];
    const mixedReturn = stockFrac * stockRet + bondFrac * bondRet;
    balance = balance * (1 + mixedReturn);

    return {
      year: i + 1,
      stockReturn: stockRet,
      bondReturn: bondRet,
      mixedReturn,
      balance: Math.round(balance),
    };
  });
}

/** Max drawdown: largest peak-to-trough decline (as a positive %). */
function calcMaxDrawdown(history: YearReturn[]): number {
  let peak = riskSliderConfig.initialInvestment;
  let maxDd = 0;

  for (const yr of history) {
    if (yr.balance > peak) peak = yr.balance;
    const dd = (peak - yr.balance) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  return Math.round(maxDd * 1000) / 10; // e.g. 23.4%
}

/** Return the year index (1-based) with the best/worst mixed return. */
function bestWorstYear(history: YearReturn[]): { best: number; worst: number } {
  let bestIdx = 0;
  let worstIdx = 0;

  for (let i = 1; i < history.length; i++) {
    if (history[i].mixedReturn > history[bestIdx].mixedReturn) bestIdx = i;
    if (history[i].mixedReturn < history[worstIdx].mixedReturn) worstIdx = i;
  }

  return { best: history[bestIdx].year, worst: history[worstIdx].year };
}

/** Average annual return across the history. */
function avgAnnualReturn(history: YearReturn[]): number {
  const sum = history.reduce((s, yr) => s + yr.mixedReturn, 0);
  return Math.round((sum / history.length) * 1000) / 10; // e.g. 7.2%
}

/** Derive risk level from stock percentage. */
function getRiskLevel(stockPercent: number): RiskLevel {
  if (stockPercent <= 30) return 'conservative';
  if (stockPercent <= 60) return 'balanced';
  return 'aggressive';
}

// ── Auto-sweep config ───────────────────────────────────────────────────

/** Auto-sweep advances by 1% every N ms */
const SWEEP_INTERVAL_MS = 80;

// ── Initial state factory ──────────────────────────────────────────────

function createInitialState(): RiskSliderState {
  const history = computeHistory(50);
  const { best, worst } = bestWorstYear(history);

  return {
    allocation: { stockPercent: 50, bondPercent: 50 },
    yearHistory: history,
    finalBalance: history[history.length - 1].balance,
    maxDrawdown: calcMaxDrawdown(history),
    bestYear: best,
    worstYear: worst,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useRiskSlider() {
  const [state, setState] = useState<RiskSliderState>(createInitialState);
  const [isSweeping, setIsSweeping] = useState(false);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sweepValueRef = useRef(0);

  // ── Slider change ──────────────────────────────────────────────────

  /** Set stock allocation (0-100). Recomputes everything live. */
  const setAllocation = useCallback((stockPercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(stockPercent)));
    const history = computeHistory(clamped);
    const { best, worst } = bestWorstYear(history);

    setState((prev) => ({
      ...prev,
      allocation: { stockPercent: clamped, bondPercent: 100 - clamped },
      yearHistory: history,
      finalBalance: history[history.length - 1].balance,
      maxDrawdown: calcMaxDrawdown(history),
      bestYear: best,
      worstYear: worst,
    }));
  }, []);

  // ── Auto-sweep ────────────────────────────────────────────────────

  /** Start auto-sweep from 0% to 100% stocks. */
  const startSweep = useCallback(() => {
    sweepValueRef.current = 0;
    setIsSweeping(true);
  }, []);

  /** Stop sweep early. */
  const stopSweep = useCallback(() => {
    setIsSweeping(false);
    if (sweepRef.current) {
      clearInterval(sweepRef.current);
      sweepRef.current = null;
    }
  }, []);

  // Manage sweep interval
  useEffect(() => {
    if (isSweeping) {
      sweepRef.current = setInterval(() => {
        const next = sweepValueRef.current + 1;
        if (next > 100) {
          setIsSweeping(false);
          return;
        }
        sweepValueRef.current = next;

        const history = computeHistory(next);
        const { best, worst } = bestWorstYear(history);

        setState((prev) => ({
          ...prev,
          allocation: { stockPercent: next, bondPercent: 100 - next },
          yearHistory: history,
          finalBalance: history[history.length - 1].balance,
          maxDrawdown: calcMaxDrawdown(history),
          bestYear: best,
          worstYear: worst,
        }));
      }, SWEEP_INTERVAL_MS);
    } else if (sweepRef.current) {
      clearInterval(sweepRef.current);
      sweepRef.current = null;
    }

    return () => {
      if (sweepRef.current) {
        clearInterval(sweepRef.current);
        sweepRef.current = null;
      }
    };
  }, [isSweeping]);

  // ── Complete ──────────────────────────────────────────────────────

  /** Mark the simulation as complete (user locks in their allocation). */
  const complete = useCallback(() => {
    setState((prev) => ({ ...prev, isComplete: true }));
  }, []);

  /** Reset to initial state. */
  const reset = useCallback(() => {
    stopSweep();
    setState(createInitialState());
  }, [stopSweep]);

  // ── Computed score ────────────────────────────────────────────────

  const averageReturn = useMemo(
    () => avgAnnualReturn(state.yearHistory),
    [state.yearHistory],
  );

  const score: RiskSliderScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    return {
      riskLevel: getRiskLevel(state.allocation.stockPercent),
      expectedReturn: averageReturn,
      maxVolatility: state.maxDrawdown,
    };
  }, [state.isComplete, state.allocation.stockPercent, averageReturn, state.maxDrawdown]);

  return {
    state,
    config: riskSliderConfig,
    averageReturn,
    isSweeping,
    score,
    setAllocation,
    startSweep,
    stopSweep,
    complete,
    reset,
  };
}
