/**
 * SIM 27: בעל הבית הווירטואלי (Virtual Landlord, REITs), Module 5-27
 * Hook: allocate budget across REIT sectors, simulate 10 years, apply world events,
 * track quarterly dividends, and compare with buying a physical apartment.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  REITState,
  REITScore,
  REITEvent,
} from './reitTypes';
import {
  reitConfig,
  REIT_BUDGET,
  REIT_SECTORS,
  REIT_EVENTS,
} from './reitData';

// ── Constants ───────────────────────────────────────────────────────────

const PLAY_INTERVAL_MS = 1_400; // advance 1 year every 1.4s

/** Physical apartment comparison: ₪100K as down payment on ₪500K apartment,
 *  3.5% annual appreciation, minus 2% maintenance costs. */
const PHYSICAL_APARTMENT_VALUE = 500_000;
const PHYSICAL_APPRECIATION = 0.035;
const PHYSICAL_MAINTENANCE_RATE = 0.02; // annual costs as % of value

// ── Types ───────────────────────────────────────────────────────────────

export interface YearSnapshot {
  year: number;
  sectorValues: Record<string, number>;
  totalValue: number;
  yearDividends: number;
  cumulativeDividends: number;
  event: REITEvent | null;
}

export interface PhysicalComparison {
  apartmentValue: number;
  totalMaintenance: number;
  netValue: number; // apartment value - down payment - maintenance
}

// ── Initial state ───────────────────────────────────────────────────────

function createInitialState(): REITState {
  return {
    allocations: {},
    totalValue: 0,
    totalDividends: 0,
    currentYear: 0,
    eventHistory: [],
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useREIT() {
  const [state, setState] = useState<REITState>(createInitialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAllocated, setIsAllocated] = useState(false);
  const [yearSnapshots, setYearSnapshots] = useState<YearSnapshot[]>([]);

  // Allocation percentages (0-100, must sum to 100)
  const [allocationPercents, setAllocationPercents] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const sector of REIT_SECTORS) {
      initial[sector.id] = 20; // equal split default
    }
    return initial;
  });

  // Refs for auto-play
  const yearRef = useRef(0);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectorValuesRef = useRef<Record<string, number>>({});
  const cumulativeDividendsRef = useRef(0);

  // ── Allocation ──────────────────────────────────────────────────────

  /** Set allocation percentage for a specific sector. Auto-adjusts others to keep total = 100. */
  const setSectorPercent = useCallback((sectorId: string, percent: number) => {
    setAllocationPercents((prev) => {
      const clamped = Math.max(0, Math.min(100, Math.round(percent / 5) * 5));
      const otherIds = REIT_SECTORS.map((s) => s.id).filter((id) => id !== sectorId);
      const otherTotal = otherIds.reduce((sum, id) => sum + (prev[id] ?? 0), 0);
      const remaining = 100 - clamped;

      const next: Record<string, number> = { ...prev, [sectorId]: clamped };

      if (otherTotal === 0) {
        // All others are 0, split remaining equally (rounded to 5)
        const each = Math.floor(remaining / otherIds.length / 5) * 5;
        let leftover = remaining;
        for (let i = 0; i < otherIds.length; i++) {
          const val = i === otherIds.length - 1 ? leftover : each;
          next[otherIds[i]] = val;
          leftover -= val;
        }
      } else {
        // Distribute remaining proportionally to current ratios
        let distributed = 0;
        for (let i = 0; i < otherIds.length; i++) {
          const id = otherIds[i];
          if (i === otherIds.length - 1) {
            // Last one gets the remainder to guarantee sum = 100
            next[id] = Math.max(0, remaining - distributed);
          } else {
            const ratio = (prev[id] ?? 0) / otherTotal;
            const val = Math.max(0, Math.round((remaining * ratio) / 5) * 5);
            next[id] = val;
            distributed += val;
          }
        }
      }
      return next;
    });
  }, []);

  /** Total allocated percentage. */
  const totalAllocatedPercent = useMemo(() => {
    return Object.values(allocationPercents).reduce((sum, p) => sum + p, 0);
  }, [allocationPercents]);

  /** Whether allocation is valid (sums to exactly 100%). */
  const isAllocationValid = totalAllocatedPercent === 100;

  /** Confirm allocation and set up initial sector values. */
  const confirmAllocation = useCallback(() => {
    if (!isAllocationValid) return;

    const allocations: Record<string, number> = {};
    const sectorValues: Record<string, number> = {};

    for (const sector of REIT_SECTORS) {
      const pct = allocationPercents[sector.id] ?? 0;
      const amount = Math.round(REIT_BUDGET * (pct / 100));
      allocations[sector.id] = amount;
      sectorValues[sector.id] = amount;
    }

    sectorValuesRef.current = { ...sectorValues };
    cumulativeDividendsRef.current = 0;
    yearRef.current = 0;

    setYearSnapshots([]);
    setIsAllocated(true);
    setState({
      allocations,
      totalValue: REIT_BUDGET,
      totalDividends: 0,
      currentYear: 0,
      eventHistory: [],
      isComplete: false,
    });
  }, [allocationPercents, isAllocationValid]);

  // ── Advance one year ──────────────────────────────────────────────

  const advanceYear = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextYear = prev.currentYear + 1;

      // Pick event for this year (events are spread across the 10 years)
      // Map events to years: event[0]→year 2, event[1]→year 4, event[2]→year 6, event[3]→year 8, event[4]→year 10
      const eventIndex = Math.floor(nextYear / 2) - 1;
      const event = (nextYear % 2 === 0 && eventIndex >= 0 && eventIndex < REIT_EVENTS.length)
        ? REIT_EVENTS[eventIndex]
        : null;

      const newSectorValues: Record<string, number> = {};
      let yearDividends = 0;

      for (const sector of REIT_SECTORS) {
        const currentValue = sectorValuesRef.current[sector.id] ?? 0;
        if (currentValue <= 0) {
          newSectorValues[sector.id] = 0;
          continue;
        }

        // Base growth (capital appreciation)
        let growthRate = sector.annualReturn - sector.dividendYield; // appreciation only (dividends paid out)

        // Apply event impact if applicable
        if (event) {
          const eventImpact = event.impacts[sector.id] ?? 0;
          growthRate += eventImpact;
        }

        // Apply volatility as random noise (seeded by year for reproducibility)
        // Small random factor: ±(volatility × 3%) to add variance without changing outcomes dramatically
        const seed = nextYear * 7 + sector.id.length * 13;
        const noise = ((Math.sin(seed) + 1) / 2 - 0.5) * sector.volatility * 0.03;
        growthRate += noise;

        // New sector value after growth
        const newValue = currentValue * (1 + growthRate);
        newSectorValues[sector.id] = Math.round(Math.max(0, newValue));

        // Dividends (paid on beginning-of-year value)
        yearDividends += currentValue * sector.dividendYield;
      }

      yearDividends = Math.round(yearDividends);
      const newCumulativeDividends = cumulativeDividendsRef.current + yearDividends;
      const newTotalValue = Object.values(newSectorValues).reduce((s, v) => s + v, 0);
      const isComplete = nextYear >= reitConfig.years;

      // Update refs
      sectorValuesRef.current = { ...newSectorValues };
      cumulativeDividendsRef.current = newCumulativeDividends;
      yearRef.current = nextYear;

      // Build snapshot
      const snapshot: YearSnapshot = {
        year: nextYear,
        sectorValues: { ...newSectorValues },
        totalValue: newTotalValue,
        yearDividends,
        cumulativeDividends: newCumulativeDividends,
        event,
      };

      setTimeout(() => {
        setYearSnapshots((snaps) => [...snaps, snapshot]);
        if (isComplete) {
          setIsPlaying(false);
        }
      }, 0);

      return {
        ...prev,
        allocations: prev.allocations, // keep original allocations
        totalValue: newTotalValue,
        totalDividends: newCumulativeDividends,
        currentYear: nextYear,
        eventHistory: event ? [...prev.eventHistory, event] : prev.eventHistory,
        isComplete,
      };
    });
  }, []);

  // ── Auto-play ─────────────────────────────────────────────────────

  const startPlay = useCallback(() => {
    if (!isAllocated || state.isComplete) return;
    setIsPlaying(true);
  }, [isAllocated, state.isComplete]);

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
        if (yearRef.current >= reitConfig.years) {
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

  // ── Physical apartment comparison ─────────────────────────────────

  const physicalComparison = useMemo<PhysicalComparison>(() => {
    const years = state.currentYear || reitConfig.years;
    let apartmentValue = PHYSICAL_APARTMENT_VALUE;
    let totalMaintenance = 0;

    for (let y = 0; y < years; y++) {
      totalMaintenance += apartmentValue * PHYSICAL_MAINTENANCE_RATE;
      apartmentValue *= (1 + PHYSICAL_APPRECIATION);
    }

    return {
      apartmentValue: Math.round(apartmentValue),
      totalMaintenance: Math.round(totalMaintenance),
      netValue: Math.round(apartmentValue - REIT_BUDGET - totalMaintenance),
    };
  }, [state.currentYear]);

  // ── Score ──────────────────────────────────────────────────────────

  const score = useMemo<REITScore | null>(() => {
    if (!state.isComplete) return null;

    const totalReturn = (state.totalValue + state.totalDividends - REIT_BUDGET) / REIT_BUDGET;
    const averageMonthlyIncome = state.totalDividends / (reitConfig.years * 12);

    // Grade based on total return over 10 years
    let grade: REITScore['grade'];
    if (totalReturn >= 1.5) grade = 'S';      // 150%+ return
    else if (totalReturn >= 1.0) grade = 'A';  // 100%+ return
    else if (totalReturn >= 0.5) grade = 'B';  // 50%+ return
    else if (totalReturn >= 0.0) grade = 'C';  // positive return
    else grade = 'F';                           // lost money

    return {
      grade,
      totalValue: Math.round(state.totalValue),
      totalDividends: Math.round(state.totalDividends),
      totalReturn,
      averageMonthlyIncome: Math.round(averageMonthlyIncome),
    };
  }, [state.isComplete, state.totalValue, state.totalDividends]);

  // ── Reset ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopPlay();
    yearRef.current = 0;
    sectorValuesRef.current = {};
    cumulativeDividendsRef.current = 0;
    setYearSnapshots([]);
    setIsAllocated(false);
    setAllocationPercents(() => {
      const initial: Record<string, number> = {};
      for (const sector of REIT_SECTORS) {
        initial[sector.id] = 20;
      }
      return initial;
    });
    setState(createInitialState());
  }, [stopPlay]);

  return {
    state,
    config: reitConfig,
    isPlaying,
    isAllocated,
    isAllocationValid,
    totalAllocatedPercent,
    allocationPercents,
    yearSnapshots,
    physicalComparison,
    score,
    setSectorPercent,
    confirmAllocation,
    advanceYear,
    startPlay,
    stopPlay,
    reset,
  };
}
