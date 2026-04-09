import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  RoboAdvisorState,
  RoboAdvisorScore,
  RoboAdvisorGrade,
  PortfolioAllocation,
} from './roboAdvisorTypes';
import {
  roboAdvisorConfig,
  RISK_ALLOCATION_MAP,
  RISK_PROFILE_LABELS,
  MANUAL_PANIC_SELL_THRESHOLD,
  MANUAL_SELL_FRACTION,
  MANUAL_CASH_RETURN,
} from './roboAdvisorData';

// ── Speed presets (ms per year) ──────────────────────────────────────────
const SPEED_MAP: Record<number, number> = {
  1: 2000,
  3: 700,
  5: 400,
};

// ── Portfolio math helpers ────────────────────────────────────────────────

interface AssetAmounts {
  stocks: number;
  bonds: number;
  cash: number;
}

function totalOf(a: AssetAmounts): number {
  return a.stocks + a.bonds + a.cash;
}

function allocationOf(a: AssetAmounts): PortfolioAllocation {
  const t = totalOf(a);
  if (t === 0) return { stocks: 0, bonds: 0, cash: 0 };
  return {
    stocks: (a.stocks / t) * 100,
    bonds: (a.bonds / t) * 100,
    cash: (a.cash / t) * 100,
  };
}

/** Apply per-asset-class returns to amounts */
function applyReturns(a: AssetAmounts, stockRet: number, bondRet: number): AssetAmounts {
  return {
    stocks: a.stocks * (1 + stockRet),
    bonds: a.bonds * (1 + bondRet),
    cash: a.cash * (1 + MANUAL_CASH_RETURN),
  };
}

/** Rebalance to target allocation if any class drifted more than threshold */
function rebalanceIfNeeded(
  a: AssetAmounts,
  target: PortfolioAllocation,
  threshold: number,
): { amounts: AssetAmounts; didRebalance: boolean } {
  const current = allocationOf(a);
  const driftedStocks = Math.abs(current.stocks - target.stocks) / 100 > threshold;
  const driftedBonds = Math.abs(current.bonds - target.bonds) / 100 > threshold;
  const driftedCash = Math.abs(current.cash - target.cash) / 100 > threshold;

  if (!driftedStocks && !driftedBonds && !driftedCash) {
    return { amounts: a, didRebalance: false };
  }

  const t = totalOf(a);
  return {
    amounts: {
      stocks: t * (target.stocks / 100),
      bonds: t * (target.bonds / 100),
      cash: t * (target.cash / 100),
    },
    didRebalance: true,
  };
}

/** Simulate manual investor behavior for one year */
function advanceManual(
  a: AssetAmounts,
  stockRet: number,
  bondRet: number,
  wasPanicSold: boolean,
): { amounts: AssetAmounts; isPanicSold: boolean } {
  // If previously panic-sold, buy back stocks with the parked cash first
  let current = { ...a };
  if (wasPanicSold) {
    // Buy back: move parked cash back into stocks (at this year's price, which is higher)
    current = {
      stocks: current.stocks + current.cash,
      bonds: current.bonds,
      cash: 0,
    };
  }

  // Apply returns
  const afterReturns = applyReturns(current, stockRet, bondRet);

  // Check if should panic-sell this year
  if (stockRet <= MANUAL_PANIC_SELL_THRESHOLD) {
    const sellAmount = afterReturns.stocks * MANUAL_SELL_FRACTION;
    return {
      amounts: {
        stocks: afterReturns.stocks - sellAmount,
        bonds: afterReturns.bonds,
        cash: afterReturns.cash + sellAmount,
      },
      isPanicSold: true,
    };
  }

  return { amounts: afterReturns, isPanicSold: false };
}

/** Compute risk profile from quiz answers (round to nearest integer 1-5) */
function computeRiskProfile(answers: Record<string, number>): number {
  const values = Object.values(answers);
  if (values.length === 0) return 3;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.max(1, Math.min(5, Math.round(avg)));
}

function createInitialState(): RoboAdvisorState {
  return {
    phase: 'quiz',
    riskProfile: null,
    allocation: null,
    roboBalance: roboAdvisorConfig.initialInvestment,
    manualBalance: roboAdvisorConfig.initialInvestment,
    currentYear: 0,
    isPlaying: false,
    isComplete: false,
    quizAnswers: {},
    rebalanceCount: 0,
    roboHistory: [roboAdvisorConfig.initialInvestment],
    manualHistory: [roboAdvisorConfig.initialInvestment],
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useRoboAdvisor() {
  const [state, setState] = useState<RoboAdvisorState>(createInitialState);
  const [speed, setSpeed] = useState<number>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roboAmountsRef = useRef<AssetAmounts>({ stocks: 0, bonds: 0, cash: 0 });
  const manualAmountsRef = useRef<AssetAmounts>({ stocks: 0, bonds: 0, cash: 0 });
  const manualPanicSoldRef = useRef(false);

  // ── Quiz ────────────────────────────────────────────────────────────

  /** Answer a quiz question */
  const answerQuestion = useCallback((questionId: string, riskScore: number) => {
    setState((prev) => {
      if (prev.phase !== 'quiz') return prev;
      return {
        ...prev,
        quizAnswers: { ...prev.quizAnswers, [questionId]: riskScore },
      };
    });
  }, []);

  /** Finish quiz → compute risk profile → enter building phase */
  const finishQuiz = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'quiz') return prev;
      const profile = computeRiskProfile(prev.quizAnswers);
      const allocation = RISK_ALLOCATION_MAP[profile];

      // Initialize asset amounts for both portfolios
      const initial = roboAdvisorConfig.initialInvestment;
      const amounts: AssetAmounts = {
        stocks: initial * (allocation.stocks / 100),
        bonds: initial * (allocation.bonds / 100),
        cash: initial * (allocation.cash / 100),
      };
      roboAmountsRef.current = { ...amounts };
      manualAmountsRef.current = { ...amounts };
      manualPanicSoldRef.current = false;

      return {
        ...prev,
        phase: 'building',
        riskProfile: profile,
        allocation,
      };
    });
  }, []);

  /** Transition from building → simulating (after portfolio build animation) */
  const startSimulation = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'building') return prev;
      return { ...prev, phase: 'simulating' };
    });
  }, []);

  // ── Simulation ──────────────────────────────────────────────────────

  /** Advance one year in the simulation */
  const advanceYear = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'simulating' || prev.isComplete || !prev.allocation) return prev;

      const nextYearIndex = prev.currentYear; // 0-indexed into marketHistory
      if (nextYearIndex >= roboAdvisorConfig.marketHistory.length) {
        return { ...prev, isComplete: true, isPlaying: false, phase: 'results' };
      }

      const marketYear = roboAdvisorConfig.marketHistory[nextYearIndex];

      // — Robo portfolio: apply returns then rebalance —
      const roboAfterReturns = applyReturns(
        roboAmountsRef.current,
        marketYear.stockReturn,
        marketYear.bondReturn,
      );
      const { amounts: roboFinal, didRebalance } = rebalanceIfNeeded(
        roboAfterReturns,
        prev.allocation,
        roboAdvisorConfig.rebalanceThreshold,
      );
      roboAmountsRef.current = roboFinal;

      // — Manual portfolio: apply returns with panic behavior —
      const { amounts: manualFinal, isPanicSold } = advanceManual(
        manualAmountsRef.current,
        marketYear.stockReturn,
        marketYear.bondReturn,
        manualPanicSoldRef.current,
      );
      manualAmountsRef.current = manualFinal;
      manualPanicSoldRef.current = isPanicSold;

      const newRoboBalance = Math.round(totalOf(roboFinal));
      const newManualBalance = Math.round(totalOf(manualFinal));
      const newYear = prev.currentYear + 1;
      const isLastYear = newYear >= roboAdvisorConfig.marketHistory.length;

      return {
        ...prev,
        currentYear: newYear,
        roboBalance: newRoboBalance,
        manualBalance: newManualBalance,
        rebalanceCount: prev.rebalanceCount + (didRebalance ? 1 : 0),
        roboHistory: [...prev.roboHistory, newRoboBalance],
        manualHistory: [...prev.manualHistory, newManualBalance],
        isComplete: isLastYear,
        isPlaying: isLastYear ? false : prev.isPlaying,
        phase: isLastYear ? 'results' : prev.phase,
      };
    });
  }, []);

  // ── Playback controls ───────────────────────────────────────────────

  const startPlaying = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || prev.phase !== 'simulating') return prev;
      return { ...prev, isPlaying: true };
    });
  }, []);

  const stopPlaying = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  /** Change playback speed (1, 3, or 5) */
  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    // Restart interval if currently playing (useEffect will handle it)
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    roboAmountsRef.current = { stocks: 0, bonds: 0, cash: 0 };
    manualAmountsRef.current = { stocks: 0, bonds: 0, cash: 0 };
    manualPanicSoldRef.current = false;
    setSpeed(1);
    setState(createInitialState());
  }, []);

  // ── Auto-play interval ─────────────────────────────────────────────
  useEffect(() => {
    if (state.isPlaying) {
      const interval = SPEED_MAP[speed] ?? SPEED_MAP[1];
      intervalRef.current = setInterval(advanceYear, interval);
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
  }, [state.isPlaying, speed, advanceYear]);

  // ── Computed: current market year ───────────────────────────────────
  const currentMarketYear =
    state.currentYear > 0 && state.currentYear <= roboAdvisorConfig.marketHistory.length
      ? roboAdvisorConfig.marketHistory[state.currentYear - 1]
      : null;

  // ── Score ──────────────────────────────────────────────────────────
  const score: RoboAdvisorScore | null = useMemo(() => {
    if (!state.isComplete || state.riskProfile === null) return null;

    const roboBal = state.roboBalance;
    const manualBal = state.manualBalance;
    const initial = roboAdvisorConfig.initialInvestment;
    const advantageShekel = roboBal - manualBal;
    const advantagePercent = manualBal > 0
      ? ((roboBal - manualBal) / manualBal) * 100
      : 0;

    const roboReturn = ((roboBal - initial) / initial) * 100;

    // Grade based on robo advantage
    let grade: RoboAdvisorGrade;
    let gradeLabel: string;
    if (roboReturn >= 80) {
      grade = 'S';
      gradeLabel = 'מדהים!';
    } else if (roboReturn >= 60) {
      grade = 'A';
      gradeLabel = 'מצוין';
    } else if (roboReturn >= 40) {
      grade = 'B';
      gradeLabel = 'טוב מאוד';
    } else if (roboReturn >= 20) {
      grade = 'C';
      gradeLabel = 'סביר';
    } else {
      grade = 'F';
      gradeLabel = 'צריך שיפור';
    }

    return {
      grade,
      gradeLabel,
      roboFinalBalance: roboBal,
      manualFinalBalance: manualBal,
      roboAdvantagePercent: Math.round(advantagePercent * 10) / 10,
      roboAdvantageShekel: Math.round(advantageShekel),
      rebalanceCount: state.rebalanceCount,
      riskProfileLabel: RISK_PROFILE_LABELS[state.riskProfile] ?? 'מאוזן',
    };
  }, [state.isComplete, state.roboBalance, state.manualBalance, state.riskProfile, state.rebalanceCount]);

  return {
    state,
    config: roboAdvisorConfig,
    currentMarketYear,
    speed,
    answerQuestion,
    finishQuiz,
    startSimulation,
    advanceYear,
    startPlaying,
    stopPlaying,
    changeSpeed,
    reset,
    score,
  };
}
