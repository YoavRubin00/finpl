/**
 * SIM 5-30: סימולטור הקריפטו (Crypto Sim) — Module 5-30
 * Hook: allocate between BTC, ETH, cash → play 3 years → compare to S&P 500.
 * Linked sliders keep allocation summing to 100%.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  CryptoAssetId,
  CryptoAllocation,
  CryptoSimState,
  CryptoSimScore,
} from './cryptoSimTypes';
import {
  cryptoSimConfig,
  DEFAULT_ALLOCATION,
  INITIAL_AMOUNT,
  TOTAL_YEARS,
} from './cryptoSimData';

// ── Constants ──────────────────────────────────────────────────────────

/** Auto-advance interval: one year every 750ms */
const YEAR_INTERVAL_MS = 750;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Compute crypto portfolio balances for each year given an allocation. */
function computeCryptoBalances(
  allocation: CryptoAllocation,
  yearCount: number,
): number[] {
  const { yearData, initialAmount } = cryptoSimConfig;
  const balances: number[] = [initialAmount];
  let balance = initialAmount;

  for (let i = 0; i < yearCount; i++) {
    const year = yearData[i];
    const weightedReturn =
      year.btcReturn * (allocation.btcPercent / 100) +
      year.ethReturn * (allocation.ethPercent / 100);
    // cash returns 0%, so cashPercent contributes nothing
    balance = balance * (1 + weightedReturn);
    balances.push(Math.round(balance));
  }

  return balances;
}

/** Compute S&P 500 benchmark balances for each year. */
function computeStockBalances(yearCount: number): number[] {
  const { yearData, initialAmount } = cryptoSimConfig;
  const balances: number[] = [initialAmount];
  let balance = initialAmount;

  for (let i = 0; i < yearCount; i++) {
    balance = balance * (1 + yearData[i].sp500Return);
    balances.push(Math.round(balance));
  }

  return balances;
}

/** Compute max drawdown as worst year-end-to-year-end drop percentage. */
function computeMaxDrawdown(balances: number[]): number {
  let maxDrop = 0;

  for (let i = 1; i < balances.length; i++) {
    if (balances[i] < balances[i - 1]) {
      const drop =
        ((balances[i - 1] - balances[i]) / balances[i - 1]) * 100;
      maxDrop = Math.max(maxDrop, drop);
    }
  }

  return Math.round(maxDrop);
}

/** Compute volatility (standard deviation of yearly returns). */
function computeVolatility(balances: number[]): number {
  if (balances.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < balances.length; i++) {
    returns.push((balances[i] - balances[i - 1]) / balances[i - 1]);
  }

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/**
 * Redistribute allocation when one slider changes.
 * The other two adjust proportionally to keep the sum at 100%.
 */
function redistributeAllocation(
  current: CryptoAllocation,
  changedAsset: CryptoAssetId,
  newPercent: number,
): CryptoAllocation {
  const clamped = Math.max(0, Math.min(100, Math.round(newPercent)));
  const remaining = 100 - clamped;

  if (changedAsset === 'btc') {
    const otherSum = current.ethPercent + current.cashPercent;
    if (otherSum > 0) {
      const ethNew = Math.round(remaining * (current.ethPercent / otherSum));
      return { btcPercent: clamped, ethPercent: ethNew, cashPercent: remaining - ethNew };
    }
    return {
      btcPercent: clamped,
      ethPercent: Math.round(remaining / 2),
      cashPercent: remaining - Math.round(remaining / 2),
    };
  }

  if (changedAsset === 'eth') {
    const otherSum = current.btcPercent + current.cashPercent;
    if (otherSum > 0) {
      const btcNew = Math.round(remaining * (current.btcPercent / otherSum));
      return { btcPercent: btcNew, ethPercent: clamped, cashPercent: remaining - btcNew };
    }
    return {
      btcPercent: Math.round(remaining / 2),
      ethPercent: clamped,
      cashPercent: remaining - Math.round(remaining / 2),
    };
  }

  // changedAsset === 'cash'
  const otherSum = current.btcPercent + current.ethPercent;
  if (otherSum > 0) {
    const btcNew = Math.round(remaining * (current.btcPercent / otherSum));
    return { btcPercent: btcNew, ethPercent: remaining - btcNew, cashPercent: clamped };
  }
  return {
    btcPercent: Math.round(remaining / 2),
    ethPercent: remaining - Math.round(remaining / 2),
    cashPercent: clamped,
  };
}

/** Grade based on max drawdown — lower drawdown = better risk management. */
function computeGrade(
  maxDrawdown: number,
): { grade: 'S' | 'A' | 'B' | 'C' | 'F'; gradeLabel: string } {
  if (maxDrawdown < 20) return { grade: 'S', gradeLabel: 'מצוין!' };
  if (maxDrawdown < 30) return { grade: 'A', gradeLabel: 'מצוין' };
  if (maxDrawdown < 45) return { grade: 'B', gradeLabel: 'טוב' };
  if (maxDrawdown < 60) return { grade: 'C', gradeLabel: 'אפשר יותר' };
  return { grade: 'F', gradeLabel: 'אפשר יותר' };
}

// ── Initial state ──────────────────────────────────────────────────────

function createInitialState(): CryptoSimState {
  return {
    allocation: { ...DEFAULT_ALLOCATION },
    cryptoBalanceByYear: [INITIAL_AMOUNT],
    stockBalanceByYear: [INITIAL_AMOUNT],
    currentYear: 0,
    maxDrawdownPercent: 0,
    isPlaying: false,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useCryptoSim() {
  const [state, setState] = useState<CryptoSimState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yearRef = useRef(0);
  const allocationRef = useRef<CryptoAllocation>({ ...DEFAULT_ALLOCATION });

  // ── Update allocation (linked sliders) ──────────────────────────────

  const updateAllocation = useCallback(
    (assetId: CryptoAssetId, newPercent: number) => {
      const newAlloc = redistributeAllocation(
        allocationRef.current,
        assetId,
        newPercent,
      );
      allocationRef.current = newAlloc;
      setState((prev) => ({ ...prev, allocation: newAlloc }));
    },
    [],
  );

  // ── Play / Pause ────────────────────────────────────────────────────

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
        const cryptoBalances = computeCryptoBalances(
          allocationRef.current,
          nextYear,
        );
        const stockBalances = computeStockBalances(nextYear);
        const maxDrop = computeMaxDrawdown(cryptoBalances);

        setState((prev) => ({
          ...prev,
          currentYear: nextYear,
          cryptoBalanceByYear: cryptoBalances,
          stockBalanceByYear: stockBalances,
          maxDrawdownPercent: maxDrop,
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

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pause();
    yearRef.current = 0;
    allocationRef.current = { ...DEFAULT_ALLOCATION };
    setState(createInitialState());
  }, [pause]);

  // ── Score ──────────────────────────────────────────────────────────

  const score: CryptoSimScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const cryptoBalances = computeCryptoBalances(
      allocationRef.current,
      TOTAL_YEARS,
    );
    const stockBalances = computeStockBalances(TOTAL_YEARS);

    const cryptoFinal = cryptoBalances[cryptoBalances.length - 1];
    const stockFinal = stockBalances[stockBalances.length - 1];
    const maxDrawdown = computeMaxDrawdown(cryptoBalances);

    const cryptoVol = computeVolatility(cryptoBalances);
    const stockVol = computeVolatility(stockBalances);
    const volatilityRatio =
      stockVol > 0
        ? Math.round((cryptoVol / stockVol) * 100) / 100
        : 0;

    const gradeInfo = computeGrade(maxDrawdown);

    return {
      cryptoFinal,
      stockFinal,
      maxDrawdown,
      volatilityRatio,
      ...gradeInfo,
    };
  }, [state.isComplete]);

  return {
    state,
    config: cryptoSimConfig,
    score,
    updateAllocation,
    play,
    pause,
    reset,
  };
}
