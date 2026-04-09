import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  InvestmentPathState,
  InvestmentPathScore,
  InvestmentPathGrade,
} from './investmentPathTypes';
import { investmentPathConfig, EARLY_TAX_RATE } from './investmentPathData';

const AUTO_ADVANCE_SPEED = 2000; // ms per event during auto-play
const ADD_MORE_MULTIPLIER = 1.5; // 'add-more' boosts monthly deposit by 50%

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calculate balance growth from startYear to endYear with compound interest + monthly deposits */
function growBalance(
  startBalance: number,
  monthlyDeposit: number,
  annualReturn: number,
  startYear: number,
  endYear: number,
): { balance: number; deposited: number } {
  const years = endYear - startYear;
  if (years <= 0) return { balance: startBalance, deposited: 0 };

  const monthlyRate = annualReturn / 12;
  let balance = startBalance;
  const totalMonths = years * 12;
  let deposited = 0;

  for (let m = 0; m < totalMonths; m++) {
    balance *= 1 + monthlyRate;
    balance += monthlyDeposit;
    deposited += monthlyDeposit;
  }

  return { balance: Math.round(balance), deposited };
}

/** Apply dip to a balance (dip events reduce balance temporarily) */
function applyDip(balance: number, eventId: string): number {
  // Dip percentages based on event data descriptions
  if (eventId === 'event-2') return balance * 0.85; // -15%
  if (eventId === 'event-5') return balance * 0.80; // -20%
  return balance;
}

/** Apply growth bonus to balance (growth events boost) */
function applyGrowth(balance: number, eventId: string): number {
  if (eventId === 'event-7') return balance * 1.25; // +25%
  return balance;
}

/** Calculate withdrawal amount after tax */
function calcWithdrawal(balance: number, totalDeposited: number): {
  withdrawnAmount: number;
  taxPaid: number;
} {
  const gains = Math.max(0, balance - totalDeposited);
  const taxPaid = Math.round(gains * EARLY_TAX_RATE);
  const withdrawnAmount = Math.round(balance - taxPaid);
  return { withdrawnAmount, taxPaid };
}

function createInitialState(): InvestmentPathState {
  return {
    balance: investmentPathConfig.initialDeposit,
    totalDeposited: investmentPathConfig.initialDeposit,
    totalGains: 0,
    year: 0,
    currentEventIndex: -1, // -1 = not started
    hasWithdrawn: false,
    withdrawnAmount: 0,
    taxPaid: 0,
    isComplete: false,
    isPlaying: false,
    selectedOptionId: null,
    ghostBalance: investmentPathConfig.initialDeposit,
  };
}

/** Grade based on whether player held and how long */
function computeGrade(hasWithdrawn: boolean, withdrawnAtYear: number): {
  grade: InvestmentPathGrade;
  gradeLabel: string;
} {
  if (!hasWithdrawn) return { grade: 'S', gradeLabel: 'אלוף הסבלנות!' };
  if (withdrawnAtYear >= 12) return { grade: 'A', gradeLabel: 'כמעט מושלם' };
  if (withdrawnAtYear >= 8) return { grade: 'B', gradeLabel: 'טוב' };
  if (withdrawnAtYear >= 4) return { grade: 'C', gradeLabel: 'סביר' };
  return { grade: 'F', gradeLabel: 'פספוס גדול' };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useInvestmentPath() {
  const [state, setState] = useState<InvestmentPathState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monthlyDepositRef = useRef(investmentPathConfig.monthlyDeposit);

  /** Advance to next event (grows balance from current year to next event's year) */
  const advanceToNextEvent = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || prev.hasWithdrawn) return prev;
      if (prev.selectedOptionId === null && prev.currentEventIndex >= 0) return prev; // must choose first

      const nextIndex = prev.currentEventIndex + 1;
      const events = investmentPathConfig.events;

      if (nextIndex >= events.length) {
        return { ...prev, isComplete: true, isPlaying: false };
      }

      const nextEvent = events[nextIndex];
      const prevYear = prev.currentEventIndex >= 0 ? events[prev.currentEventIndex].year : 0;
      const nextYear = nextEvent.year;

      // Grow balance from previous year to next event's year
      const { balance: grownBalance, deposited } = growBalance(
        prev.balance,
        monthlyDepositRef.current,
        investmentPathConfig.annualReturn,
        prevYear,
        nextYear,
      );

      // Apply event-specific market effects
      let eventBalance = grownBalance;
      if (nextEvent.type === 'dip') {
        eventBalance = applyDip(grownBalance, nextEvent.id);
      } else if (nextEvent.type === 'growth') {
        eventBalance = applyGrowth(grownBalance, nextEvent.id);
      }
      eventBalance = Math.round(eventBalance);

      // Ghost balance always grows (no withdrawals, no event-specific changes for ghost)
      const { balance: ghostGrown } = growBalance(
        prev.ghostBalance,
        investmentPathConfig.monthlyDeposit,
        investmentPathConfig.annualReturn,
        prevYear,
        nextYear,
      );
      let ghostBalance = ghostGrown;
      if (nextEvent.type === 'dip') {
        ghostBalance = applyDip(ghostGrown, nextEvent.id);
      } else if (nextEvent.type === 'growth') {
        ghostBalance = applyGrowth(ghostGrown, nextEvent.id);
      }
      ghostBalance = Math.round(ghostBalance);

      const totalDeposited = prev.totalDeposited + deposited;
      const totalGains = eventBalance - totalDeposited;
      const isLastEvent = nextIndex >= events.length - 1;

      return {
        ...prev,
        balance: eventBalance,
        totalDeposited,
        totalGains,
        year: nextYear,
        currentEventIndex: nextIndex,
        selectedOptionId: null,
        ghostBalance,
        isComplete: isLastEvent,
        isPlaying: isLastEvent ? false : prev.isPlaying,
      };
    });
  }, []);

  /** Player selects an option for the current event */
  const selectOption = useCallback((optionId: string) => {
    setState((prev) => {
      if (prev.isComplete || prev.hasWithdrawn || prev.currentEventIndex < 0) return prev;

      const currentEvent = investmentPathConfig.events[prev.currentEventIndex];
      const option = currentEvent.options.find((o) => o.id === optionId);
      if (!option) return prev;

      if (option.effect === 'withdraw') {
        const { withdrawnAmount, taxPaid } = calcWithdrawal(prev.balance, prev.totalDeposited);
        return {
          ...prev,
          selectedOptionId: optionId,
          hasWithdrawn: true,
          withdrawnAmount,
          taxPaid,
          isPlaying: false,
        };
      }

      if (option.effect === 'add-more') {
        // Boost monthly deposit for future growth
        monthlyDepositRef.current = Math.round(
          investmentPathConfig.monthlyDeposit * ADD_MORE_MULTIPLIER,
        );
      }

      return {
        ...prev,
        selectedOptionId: optionId,
      };
    });
  }, []);

  /** Get the selected option object for feedback display */
  const selectedOption = useMemo(() => {
    if (state.currentEventIndex < 0 || state.selectedOptionId === null) return null;
    const event = investmentPathConfig.events[state.currentEventIndex];
    return event.options.find((o) => o.id === state.selectedOptionId) ?? null;
  }, [state.currentEventIndex, state.selectedOptionId]);

  /** Current event object */
  const currentEvent =
    state.currentEventIndex >= 0 && state.currentEventIndex < investmentPathConfig.events.length
      ? investmentPathConfig.events[state.currentEventIndex]
      : null;

  /** Start auto-advance */
  const startPlaying = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || prev.hasWithdrawn) return prev;
      return { ...prev, isPlaying: true };
    });
  }, []);

  /** Pause auto-advance */
  const stopPlaying = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  /** Reset to initial state */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    monthlyDepositRef.current = investmentPathConfig.monthlyDeposit;
    setState(createInitialState());
  }, []);

  // ── Auto-advance interval ──────────────────────────────────────────────
  useEffect(() => {
    if (state.isPlaying && state.selectedOptionId !== null) {
      // Only auto-advance after player has selected an option
      intervalRef.current = setInterval(advanceToNextEvent, AUTO_ADVANCE_SPEED);
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
  }, [state.isPlaying, state.selectedOptionId, advanceToNextEvent]);

  // ── Score ──────────────────────────────────────────────────────────────
  const score: InvestmentPathScore | null = useMemo(() => {
    if (!state.isComplete && !state.hasWithdrawn) return null;

    // Calculate what full journey would yield (ghost balance at end)
    let potentialBalance = state.ghostBalance;
    if (!state.isComplete && state.hasWithdrawn) {
      // Continue ghost balance to year 15
      const currentYear = state.year;
      const finalYear = 15;
      const { balance: finalGhost } = growBalance(
        state.ghostBalance,
        investmentPathConfig.monthlyDeposit,
        investmentPathConfig.annualReturn,
        currentYear,
        finalYear,
      );
      potentialBalance = finalGhost;
    }

    const withdrawnAtYear = state.hasWithdrawn ? state.year : 0;
    const { grade, gradeLabel } = computeGrade(state.hasWithdrawn, withdrawnAtYear);

    const finalBalance = state.hasWithdrawn ? state.withdrawnAmount : state.balance;

    return {
      grade,
      gradeLabel,
      finalBalance,
      totalDeposited: state.totalDeposited,
      totalGains: state.totalGains,
      taxPaid: state.taxPaid,
      potentialBalance: Math.round(potentialBalance),
      withdrawnAtYear,
    };
  }, [
    state.isComplete,
    state.hasWithdrawn,
    state.ghostBalance,
    state.year,
    state.withdrawnAmount,
    state.balance,
    state.totalDeposited,
    state.totalGains,
    state.taxPaid,
  ]);

  return {
    state,
    config: investmentPathConfig,
    currentEvent,
    selectedOption,
    advanceToNextEvent,
    selectOption,
    startPlaying,
    stopPlaying,
    reset,
    score,
  };
}
