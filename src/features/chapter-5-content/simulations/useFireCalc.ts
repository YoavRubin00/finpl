/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Hook: slide savings rate, compute years-to-FIRE, year-by-year projection.
 */

import { useState, useCallback, useMemo } from 'react';

import type { FIRECalcState, FIRECalcScore, LifestylePreset } from './fireCalcTypes';
import {
  fireCalcConfig,
  LIFESTYLE_PRESETS,
  DEFAULT_MONTHLY_INCOME,
  DEFAULT_CURRENT_AGE,
} from './fireCalcData';

// ── Types ────────────────────────────────────────────────────────────────

export interface YearProjection {
  year: number;
  age: number;
  balance: number;
  totalContributed: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Calculate years to reach target portfolio with monthly contributions at annual return. */
function calcYearsToFIRE(
  monthlyInvestment: number,
  targetPortfolio: number,
  annualReturn: number,
): number {
  if (monthlyInvestment <= 0) return 99;
  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) {
    return Math.ceil(targetPortfolio / (monthlyInvestment * 12));
  }
  // Future value of annuity: FV = PMT × [((1+r)^n - 1) / r]
  // Solve for n: n = ln(FV×r/PMT + 1) / ln(1+r)
  const inner = (targetPortfolio * monthlyRate) / monthlyInvestment + 1;
  if (inner <= 0) return 99;
  const months = Math.log(inner) / Math.log(1 + monthlyRate);
  const years = Math.ceil(months / 12);
  return Math.min(years, 99);
}

/** Build year-by-year growth projection with monthly compounding. */
function buildProjection(
  monthlyInvestment: number,
  annualReturn: number,
  years: number,
  startAge: number,
): YearProjection[] {
  const monthlyRate = annualReturn / 12;
  const projection: YearProjection[] = [];
  let balance = 0;
  let totalContributed = 0;

  // Year 0
  projection.push({ year: 0, age: startAge, balance: 0, totalContributed: 0 });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyInvestment;
      totalContributed += monthlyInvestment;
    }
    projection.push({
      year: y,
      age: startAge + y,
      balance: Math.round(balance),
      totalContributed: Math.round(totalContributed),
    });
  }

  return projection;
}

/** Find the closest lifestyle preset for a given savings rate. */
function findClosestPreset(savingsRate: number): LifestylePreset {
  let closest = LIFESTYLE_PRESETS[0];
  let minDiff = Math.abs(savingsRate - closest.savingsRate);
  for (const preset of LIFESTYLE_PRESETS) {
    const diff = Math.abs(savingsRate - preset.savingsRate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = preset;
    }
  }
  return closest;
}

// ── Initial state ────────────────────────────────────────────────────────

function createInitialState(): FIRECalcState {
  const savingsRate = 0.20;
  const monthlyInvestment = DEFAULT_MONTHLY_INCOME * savingsRate;
  const annualExpenses = DEFAULT_MONTHLY_INCOME * (1 - savingsRate) * 12;
  const targetPortfolio = annualExpenses / fireCalcConfig.withdrawalRate;
  const yearsToFIRE = calcYearsToFIRE(
    monthlyInvestment,
    targetPortfolio,
    fireCalcConfig.annualReturn,
  );

  return {
    savingsRate,
    yearsToFIRE,
    targetPortfolio: Math.round(targetPortfolio),
    monthlyInvestment: Math.round(monthlyInvestment),
    currentAge: DEFAULT_CURRENT_AGE,
    fireAge: DEFAULT_CURRENT_AGE + yearsToFIRE,
    lifestylePreview: findClosestPreset(savingsRate),
    isComplete: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useFireCalc() {
  const [state, setState] = useState<FIRECalcState>(createInitialState);
  const [monthlyIncome, setMonthlyIncomeRaw] = useState(DEFAULT_MONTHLY_INCOME);

  // ── Recalculate helper ──────────────────────────────────────────────

  const recalc = useCallback(
    (savingsRate: number, income: number, age: number) => {
      const monthlyInvestment = income * savingsRate;
      const annualExpenses = income * (1 - savingsRate) * 12;
      const targetPortfolio = annualExpenses / fireCalcConfig.withdrawalRate;
      const yearsToFIRE = calcYearsToFIRE(
        monthlyInvestment,
        targetPortfolio,
        fireCalcConfig.annualReturn,
      );

      const newState: FIRECalcState = {
        savingsRate,
        yearsToFIRE,
        targetPortfolio: Math.round(targetPortfolio),
        monthlyInvestment: Math.round(monthlyInvestment),
        currentAge: age,
        fireAge: age + yearsToFIRE,
        lifestylePreview: findClosestPreset(savingsRate),
        isComplete: false,
      };
      setState(newState);
    },
    [],
  );

  // ── Actions ─────────────────────────────────────────────────────────

  /** Set savings rate (0.10 – 0.70). */
  const setSavingsRate = useCallback(
    (rate: number) => {
      const clamped = Math.max(0.10, Math.min(0.70, rate));
      recalc(clamped, monthlyIncome, state.currentAge);
    },
    [recalc, monthlyIncome, state.currentAge],
  );

  /** Set custom monthly income. */
  const setMonthlyIncome = useCallback(
    (income: number) => {
      const clamped = Math.max(5_000, Math.min(100_000, income));
      setMonthlyIncomeRaw(clamped);
      recalc(state.savingsRate, clamped, state.currentAge);
    },
    [recalc, state.savingsRate, state.currentAge],
  );

  /** Set current age. */
  const setCurrentAge = useCallback(
    (age: number) => {
      const clamped = Math.max(18, Math.min(60, age));
      recalc(state.savingsRate, monthlyIncome, clamped);
    },
    [recalc, state.savingsRate, monthlyIncome],
  );

  /** Mark simulation complete. */
  const complete = useCallback(() => {
    setState((prev) => ({ ...prev, isComplete: true }));
  }, []);

  /** Reset to initial state. */
  const reset = useCallback(() => {
    setMonthlyIncomeRaw(DEFAULT_MONTHLY_INCOME);
    setState(createInitialState());
  }, []);

  // ── Computed ────────────────────────────────────────────────────────

  /** Year-by-year growth projection up to FIRE age. */
  const projection = useMemo<YearProjection[]>(
    () =>
      buildProjection(
        state.monthlyInvestment,
        fireCalcConfig.annualReturn,
        state.yearsToFIRE,
        state.currentAge,
      ),
    [state.monthlyInvestment, state.yearsToFIRE, state.currentAge],
  );

  /** Score, only meaningful when complete. */
  const score = useMemo<FIRECalcScore>(
    () => ({
      yearsToFIRE: state.yearsToFIRE,
      fireAge: state.fireAge,
      totalInvested: state.monthlyInvestment * 12 * state.yearsToFIRE,
      portfolioAtFIRE: projection.length > 0
        ? projection[projection.length - 1].balance
        : 0,
    }),
    [state.yearsToFIRE, state.fireAge, state.monthlyInvestment, projection],
  );

  /** Is user in FIRE warrior territory (≥50% savings rate). */
  const isFireWarrior = state.savingsRate >= 0.50;

  return {
    state,
    config: fireCalcConfig,
    monthlyIncome,
    projection,
    score,
    isFireWarrior,
    setSavingsRate,
    setMonthlyIncome,
    setCurrentAge,
    complete,
    reset,
  };
}
