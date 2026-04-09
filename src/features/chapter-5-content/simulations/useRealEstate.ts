/**
 * SIM 26: משחקי הנדל"ן (Real Estate Game) — Module 5-26
 * Hook: choose mortgage, auto-play 20+ years, apply life events, track totals.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  MortgageOption,
  RealEstateEvent,
  RealEstateState,
  RealEstateScore,
} from './realEstateTypes';
import {
  realEstateConfig,
  LOAN_AMOUNT,
  DOWN_PAYMENT,
  FIXED_RATE,
  FIXED_RATE_MIX,
  VARIABLE_RATE_INITIAL,
  VARIABLE_RATE_FULL,
} from './realEstateData';
import { useModifiersStore } from '../../economy/useModifiersStore';

// ── Constants ───────────────────────────────────────────────────────────

const PLAY_INTERVAL_MS = 1_200; // advance 1 year every 1.2s

// ── Types ───────────────────────────────────────────────────────────────

export interface YearSnapshot {
  year: number;
  monthlyPayment: number;
  totalPaidThisYear: number;
  cumulativePaid: number;
  remainingLoan: number;
  propertyValue: number;
  event: RealEstateEvent | null;
  extraExpenses: number;
}

// ── PMT helper ──────────────────────────────────────────────────────────

/** Monthly payment: P × r(1+r)^n / ((1+r)^n - 1) */
function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / (years * 12);
  const n = years * 12;
  const factor = Math.pow(1 + r, n);
  return principal * (r * factor) / (factor - 1);
}

/** Remaining balance after k months of payments on original loan. */
function calcRemainingAfterMonths(
  principal: number,
  annualRate: number,
  totalYears: number,
  monthsPaid: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return principal - (principal / (totalYears * 12)) * monthsPaid;
  const n = totalYears * 12;
  const factor = Math.pow(1 + r, n);
  const factorK = Math.pow(1 + r, monthsPaid);
  return principal * (factor - factorK) / (factor - 1);
}

// ── Rate helpers per option ─────────────────────────────────────────────

function getInitialRates(option: MortgageOption): { fixedRate: number; variableRate: number } {
  if (option.id === 'fixed-safe') {
    return { fixedRate: FIXED_RATE, variableRate: 0 };
  }
  if (option.id === 'balanced-mix') {
    return { fixedRate: FIXED_RATE_MIX, variableRate: VARIABLE_RATE_INITIAL };
  }
  // variable-risky
  return { fixedRate: 0, variableRate: VARIABLE_RATE_FULL };
}

// ── Initial state ───────────────────────────────────────────────────────

function createInitialState(): RealEstateState {
  return {
    selectedMortgage: null,
    currentYear: 0,
    monthlyPayment: 0,
    totalPaid: 0,
    remainingLoan: LOAN_AMOUNT,
    propertyValue: realEstateConfig.propertyPrice,
    eventsHistory: [],
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useRealEstate() {
  const [state, setState] = useState<RealEstateState>(createInitialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [yearSnapshots, setYearSnapshots] = useState<YearSnapshot[]>([]);
  const [currentVariableRate, setCurrentVariableRate] = useState(0);
  const [totalExtraExpenses, setTotalExtraExpenses] = useState(0);

  const yearRef = useRef(0);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const variableRateRef = useRef(0);
  
  const discount = useModifiersStore((s) => s.getActiveModifierValue('real_estate_discount'));
  const currentPropertyPrice = realEstateConfig.propertyPrice * (1 - discount);
  const currentLoanAmount = currentPropertyPrice - realEstateConfig.downPayment;

  const propertyValueRef = useRef(currentPropertyPrice);
  const cumulativePaidRef = useRef(0);
  const extraExpensesRef = useRef(0);

  // ── Select mortgage ─────────────────────────────────────────────────

  const selectMortgage = useCallback((option: MortgageOption) => {
    const rates = getInitialRates(option);
    const fixedPortion = currentLoanAmount * option.fixedPercent;
    const variablePortion = currentLoanAmount * option.variablePercent;
    const fixedPayment = calcMonthlyPayment(fixedPortion, rates.fixedRate, option.years);
    const variablePayment = calcMonthlyPayment(variablePortion, rates.variableRate, option.years);
    const monthly = Math.round(fixedPayment + variablePayment);

    variableRateRef.current = rates.variableRate;
    propertyValueRef.current = currentPropertyPrice;
    cumulativePaidRef.current = 0;
    extraExpensesRef.current = 0;
    yearRef.current = 0;

    setCurrentVariableRate(rates.variableRate);
    setTotalExtraExpenses(0);
    setYearSnapshots([]);
    setState({
      selectedMortgage: option,
      currentYear: 0,
      monthlyPayment: monthly,
      totalPaid: 0,
      remainingLoan: currentLoanAmount,
      propertyValue: currentPropertyPrice,
      eventsHistory: [],
      isComplete: false,
    });
  }, [currentLoanAmount, currentPropertyPrice]);

  // ── Advance one year ────────────────────────────────────────────────

  const advanceYear = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedMortgage || prev.isComplete) return prev;

      const option = prev.selectedMortgage;
      const nextYear = prev.currentYear + 1;
      const rates = getInitialRates(option);

      // Check for event this year
      const event = realEstateConfig.events.find((e) => e.year === nextYear) ?? null;
      let newVariableRate = variableRateRef.current;
      let newPropertyValue = propertyValueRef.current;
      let yearExtraExpense = 0;

      if (event) {
        switch (event.effect) {
          case 'rate-hike':
            newVariableRate = Math.max(0, newVariableRate + event.impact);
            break;
          case 'expense':
            yearExtraExpense = event.impact;
            break;
          case 'property-value':
            newPropertyValue = newPropertyValue * (1 + event.impact);
            break;
          case 'income-change':
            // Could be used for rental income changes — no-op for now
            break;
        }
      }

      // Recalculate monthly payment with updated variable rate
      const fixedPortion = currentLoanAmount * option.fixedPercent;
      const variablePortion = currentLoanAmount * option.variablePercent;
      const fixedPayment = calcMonthlyPayment(fixedPortion, rates.fixedRate, option.years);
      // Variable payment recalculated with remaining term
      const remainingYears = Math.max(1, option.years - nextYear);
      // Approximate remaining variable balance
      const monthsPaid = nextYear * 12;
      const remainingVariableBalance = option.variablePercent > 0
        ? calcRemainingAfterMonths(variablePortion, variableRateRef.current, option.years, Math.min(monthsPaid, option.years * 12 - 12))
        : 0;
      const variablePayment = option.variablePercent > 0
        ? calcMonthlyPayment(remainingVariableBalance, newVariableRate, remainingYears)
        : 0;
      const newMonthly = Math.round(fixedPayment + variablePayment);

      // Year of payments
      const yearPayments = newMonthly * 12;
      const newCumulativePaid = cumulativePaidRef.current + yearPayments + yearExtraExpense;
      const newExtraExpenses = extraExpensesRef.current + yearExtraExpense;

      // Remaining loan (approximate — reduce by principal paid this year)
      // Simplified: remaining = previous remaining - (yearPayments - interest portion)
      const avgRate = option.fixedPercent * rates.fixedRate + option.variablePercent * newVariableRate;
      const yearInterest = prev.remainingLoan * avgRate;
      const principalPaid = Math.max(0, yearPayments - yearInterest);
      const newRemainingLoan = Math.max(0, prev.remainingLoan - principalPaid);

      // Update refs
      variableRateRef.current = newVariableRate;
      propertyValueRef.current = newPropertyValue;
      cumulativePaidRef.current = newCumulativePaid;
      extraExpensesRef.current = newExtraExpenses;
      yearRef.current = nextYear;

      const isComplete = nextYear >= 20;

      // Build snapshot
      const snapshot: YearSnapshot = {
        year: nextYear,
        monthlyPayment: newMonthly,
        totalPaidThisYear: yearPayments + yearExtraExpense,
        cumulativePaid: newCumulativePaid,
        remainingLoan: Math.round(newRemainingLoan),
        propertyValue: Math.round(newPropertyValue),
        event,
        extraExpenses: yearExtraExpense,
      };

      // We need to update snapshots outside setState — use a trick with setTimeout
      setTimeout(() => {
        setYearSnapshots((snaps) => [...snaps, snapshot]);
        setCurrentVariableRate(newVariableRate);
        setTotalExtraExpenses(newExtraExpenses);
        if (isComplete) {
          setIsPlaying(false);
        }
      }, 0);

      return {
        ...prev,
        currentYear: nextYear,
        monthlyPayment: newMonthly,
        totalPaid: Math.round(newCumulativePaid),
        remainingLoan: Math.round(newRemainingLoan),
        propertyValue: Math.round(newPropertyValue),
        eventsHistory: event ? [...prev.eventsHistory, event] : prev.eventsHistory,
        isComplete,
      };
    });
  }, [currentLoanAmount]);

  // ── Auto-play ───────────────────────────────────────────────────────

  const startPlay = useCallback(() => {
    if (!state.selectedMortgage || state.isComplete) return;
    setIsPlaying(true);
  }, [state.selectedMortgage, state.isComplete]);

  const stopPlay = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      // Fire first year immediately
      advanceYear();
      playRef.current = setInterval(() => {
        if (yearRef.current >= 20) {
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

  const score = useMemo<RealEstateScore | null>(() => {
    if (!state.isComplete) return null;

    const totalInterest = state.totalPaid - currentLoanAmount - totalExtraExpenses;
    const netGainOrLoss = state.propertyValue - state.totalPaid - realEstateConfig.downPayment;

    // Grade based on interest-to-principal ratio
    const interestRatio = totalInterest / currentLoanAmount;
    let grade: RealEstateScore['grade'];
    if (interestRatio < 0.4) grade = 'S';
    else if (interestRatio < 0.6) grade = 'A';
    else if (interestRatio < 0.8) grade = 'B';
    else if (interestRatio < 1.0) grade = 'C';
    else grade = 'F';

    return {
      grade,
      totalPaid: Math.round(state.totalPaid),
      totalInterest: Math.round(Math.max(0, totalInterest)),
      propertyFinalValue: Math.round(state.propertyValue),
      netGainOrLoss: Math.round(netGainOrLoss),
    };
  }, [state.isComplete, state.totalPaid, state.propertyValue, totalExtraExpenses]);

  // ── Reset ───────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopPlay();
    yearRef.current = 0;
    variableRateRef.current = 0;
    propertyValueRef.current = currentPropertyPrice;
    cumulativePaidRef.current = 0;
    extraExpensesRef.current = 0;
    setCurrentVariableRate(0);
    setTotalExtraExpenses(0);
    setYearSnapshots([]);
    setState(createInitialState());
  }, [stopPlay]);

  return {
    state,
    config: realEstateConfig,
    isPlaying,
    yearSnapshots,
    currentVariableRate,
    totalExtraExpenses,
    score,
    selectMortgage,
    advanceYear,
    startPlay,
    stopPlay,
    reset,
  };
}
