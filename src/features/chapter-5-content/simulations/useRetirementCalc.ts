/**
 * SIM 28: מחשבון הפרישה (Retirement Calculator) — Module 5-28
 * Hook: choose withdrawal strategy, auto-play 25 years (age 67→92),
 * track balance depletion, tax, and inheritance potential.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  WithdrawalStrategy,
  RetirementYear,
  RetirementCalcState,
  RetirementCalcScore,
} from './retirementCalcTypes';
import {
  retirementCalcConfig,
  RETIREMENT_AGE,
  SIMULATION_YEARS,
  MONTHLY_EXPENSES,
  LUMP_SUM_RETURN,
  INFLATION_RATE,
  ANNUITY_TAX_RATE,
  LUMP_SUM_TAX_RATE,
} from './retirementCalcData';

// ── Constants ───────────────────────────────────────────────────────────

const PLAY_INTERVAL_MS = 1_400; // advance 1 year every 1.4s

// ── Types ───────────────────────────────────────────────────────────────

export interface RetirementYearSnapshot {
  year: number;
  age: number;
  balance: number;
  withdrawal: number;
  expenses: number;
  taxPaid: number;
  netRemaining: number;
  monthlyIncome: number; // effective monthly income after tax
  isBankrupt: boolean;
}

// ── Simulation logic ────────────────────────────────────────────────────

function simulateYear(
  strategy: WithdrawalStrategy,
  prevBalance: number,
  yearIndex: number, // 1-based
  costBasis: number, // original lump sum for tax calculation
): {
  snapshot: RetirementYearSnapshot;
  newBalance: number;
  newCostBasis: number;
} {
  const age = RETIREMENT_AGE + yearIndex;
  const annualExpenses = MONTHLY_EXPENSES * 12 * Math.pow(1 + INFLATION_RATE, yearIndex);

  let balance = prevBalance;
  let withdrawal = 0;
  let taxPaid = 0;
  let monthlyIncome = 0;
  let updatedCostBasis = costBasis;

  if (strategy.type === 'lump-sum') {
    // Invest entire lump sum, grow at LUMP_SUM_RETURN, withdraw expenses
    const investmentGain = balance * LUMP_SUM_RETURN;
    balance += investmentGain;

    // Tax on gains only (not principal)
    const gainTax = Math.max(0, investmentGain) * LUMP_SUM_TAX_RATE;
    taxPaid = gainTax;
    balance -= gainTax;

    // Withdraw to cover expenses
    withdrawal = Math.min(balance, annualExpenses);
    balance -= withdrawal;
    monthlyIncome = withdrawal / 12;
  } else if (strategy.type === 'monthly-annuity') {
    // Guaranteed monthly, taxed at lower rate
    const annualAnnuity = (strategy.monthlyAmount ?? 0) * 12;
    withdrawal = annualAnnuity;
    taxPaid = annualAnnuity * ANNUITY_TAX_RATE;
    monthlyIncome = (annualAnnuity - taxPaid) / 12;
    // No balance to manage — annuity is guaranteed for life
    balance = 0; // annuity has no investable balance
    updatedCostBasis = 0;
  } else {
    // Hybrid: annuity portion + lump sum portion
    const annualAnnuity = (strategy.monthlyAmount ?? 0) * 12;
    const annuityTax = annualAnnuity * ANNUITY_TAX_RATE;

    // Lump sum portion grows and may be withdrawn
    const investmentGain = balance * LUMP_SUM_RETURN;
    balance += investmentGain;
    const gainTax = Math.max(0, investmentGain) * LUMP_SUM_TAX_RATE;
    balance -= gainTax;

    // Do we need to withdraw from lump sum to cover remaining expenses?
    const annuityNetIncome = annualAnnuity - annuityTax;
    const expenseShortfall = Math.max(0, annualExpenses - annuityNetIncome);
    const lumpWithdrawal = Math.min(balance, expenseShortfall);
    balance -= lumpWithdrawal;

    withdrawal = annualAnnuity + lumpWithdrawal;
    taxPaid = annuityTax + gainTax;
    monthlyIncome = (annuityNetIncome + lumpWithdrawal) / 12;
  }

  const isBankrupt =
    strategy.type !== 'monthly-annuity' && balance <= 0 && yearIndex < SIMULATION_YEARS;

  return {
    snapshot: {
      year: yearIndex,
      age,
      balance: Math.round(Math.max(0, balance)),
      withdrawal: Math.round(withdrawal),
      expenses: Math.round(annualExpenses),
      taxPaid: Math.round(taxPaid),
      netRemaining: Math.round(Math.max(0, balance)),
      monthlyIncome: Math.round(monthlyIncome),
      isBankrupt,
    },
    newBalance: Math.max(0, balance),
    newCostBasis: updatedCostBasis,
  };
}

// ── Initial state ───────────────────────────────────────────────────────

function createInitialState(): RetirementCalcState {
  return {
    selectedStrategy: null,
    yearlyProjection: [],
    currentYear: 0,
    isPlaying: false,
    bankruptAge: null,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useRetirementCalc() {
  const [state, setState] = useState<RetirementCalcState>(createInitialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [yearSnapshots, setYearSnapshots] = useState<RetirementYearSnapshot[]>([]);

  const yearRef = useRef(0);
  const balanceRef = useRef(0);
  const costBasisRef = useRef(0);
  const bankruptAgeRef = useRef<number | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Select strategy ─────────────────────────────────────────────────

  const selectStrategy = useCallback((strategy: WithdrawalStrategy) => {
    const initialBalance = strategy.lumpSum ?? 0;
    balanceRef.current = initialBalance;
    costBasisRef.current = initialBalance;
    bankruptAgeRef.current = null;
    yearRef.current = 0;

    setYearSnapshots([]);
    setState({
      selectedStrategy: strategy,
      yearlyProjection: [],
      currentYear: 0,
      isPlaying: false,
      bankruptAge: null,
      isComplete: false,
    });
  }, []);

  // ── Advance one year ────────────────────────────────────────────────

  const advanceYear = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedStrategy || prev.isComplete) return prev;

      const nextYear = prev.currentYear + 1;
      const { snapshot, newBalance, newCostBasis } = simulateYear(
        prev.selectedStrategy,
        balanceRef.current,
        nextYear,
        costBasisRef.current,
      );

      // Track bankruptcy
      if (snapshot.isBankrupt && bankruptAgeRef.current === null) {
        bankruptAgeRef.current = snapshot.age;
      }

      balanceRef.current = newBalance;
      costBasisRef.current = newCostBasis;
      yearRef.current = nextYear;

      const isComplete = nextYear >= SIMULATION_YEARS;

      const retirementYear: RetirementYear = {
        year: snapshot.year,
        age: snapshot.age,
        balance: snapshot.balance,
        withdrawal: snapshot.withdrawal,
        expenses: snapshot.expenses,
        taxPaid: snapshot.taxPaid,
        netRemaining: snapshot.netRemaining,
      };

      setTimeout(() => {
        setYearSnapshots((snaps) => [...snaps, snapshot]);
        if (isComplete) {
          setIsPlaying(false);
        }
      }, 0);

      return {
        ...prev,
        currentYear: nextYear,
        yearlyProjection: [...prev.yearlyProjection, retirementYear],
        bankruptAge: bankruptAgeRef.current,
        isComplete,
      };
    });
  }, []);

  // ── Auto-play ───────────────────────────────────────────────────────

  const startPlay = useCallback(() => {
    if (!state.selectedStrategy || state.isComplete) return;
    setIsPlaying(true);
  }, [state.selectedStrategy, state.isComplete]);

  const stopPlay = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      advanceYear();
      playRef.current = setInterval(() => {
        if (yearRef.current >= SIMULATION_YEARS) {
          if (playRef.current) {
            clearInterval(playRef.current);
            playRef.current = null;
          }
          setIsPlaying(false);
          return;
        }
        advanceYear();
      }, PLAY_INTERVAL_MS);
    } else {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    }

    return () => {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, advanceYear]);

  // ── Score ───────────────────────────────────────────────────────────

  const score = useMemo<RetirementCalcScore | null>(() => {
    if (!state.isComplete || !state.selectedStrategy) return null;

    const totalReceived = state.yearlyProjection.reduce((sum, y) => sum + y.withdrawal, 0);
    const totalTax = state.yearlyProjection.reduce((sum, y) => sum + y.taxPaid, 0);
    const lastYear = state.yearlyProjection[state.yearlyProjection.length - 1];
    const inheritancePotential = lastYear ? lastYear.netRemaining : 0;
    const depletionRisk = bankruptAgeRef.current !== null;

    // Grade: higher total received with no depletion = better
    // S: annuity (safe, guaranteed), A: hybrid no depletion, B: lump no depletion,
    // C: any strategy with late depletion (>85), F: early depletion (≤85)
    let grade: RetirementCalcScore['grade'];
    if (!depletionRisk && state.selectedStrategy.type === 'monthly-annuity') {
      grade = 'S'; // safest choice
    } else if (!depletionRisk && state.selectedStrategy.type === 'hybrid') {
      grade = 'A';
    } else if (!depletionRisk) {
      grade = 'B'; // lump sum survived 25 years
    } else if (bankruptAgeRef.current !== null && bankruptAgeRef.current > 85) {
      grade = 'C'; // late depletion
    } else {
      grade = 'F'; // early depletion
    }

    return {
      grade,
      totalReceived: Math.round(totalReceived),
      taxPaid: Math.round(totalTax),
      depletionRisk,
      bankruptAge: bankruptAgeRef.current,
      inheritancePotential: Math.round(inheritancePotential),
    };
  }, [state.isComplete, state.selectedStrategy, state.yearlyProjection]);

  // ── All-strategies comparison (pre-computed for side-by-side) ──────

  const allStrategiesComparison = useMemo(() => {
    return retirementCalcConfig.strategies.map((strategy) => {
      let balance = strategy.lumpSum ?? 0;
      let basis = balance;
      let totalReceived = 0;
      let totalTax = 0;
      let bankrupt: number | null = null;

      for (let y = 1; y <= SIMULATION_YEARS; y++) {
        const { snapshot, newBalance, newCostBasis } = simulateYear(
          strategy,
          balance,
          y,
          basis,
        );
        balance = newBalance;
        basis = newCostBasis;
        totalReceived += snapshot.withdrawal;
        totalTax += snapshot.taxPaid;
        if (snapshot.isBankrupt && bankrupt === null) {
          bankrupt = snapshot.age;
        }
      }

      return {
        strategy,
        totalReceived: Math.round(totalReceived),
        totalTax: Math.round(totalTax),
        bankruptAge: bankrupt,
        inheritancePotential: Math.round(Math.max(0, balance)),
      };
    });
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopPlay();
    yearRef.current = 0;
    balanceRef.current = 0;
    costBasisRef.current = 0;
    bankruptAgeRef.current = null;
    setYearSnapshots([]);
    setState(createInitialState());
  }, [stopPlay]);

  return {
    state,
    config: retirementCalcConfig,
    isPlaying,
    yearSnapshots,
    score,
    allStrategiesComparison,
    selectStrategy,
    advanceYear,
    startPlay,
    stopPlay,
    reset,
  };
}
