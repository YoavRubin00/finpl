/**
 * SIM 24: מנהל התיקים (Portfolio Manager), Module 4-24
 * Hook: allocate budget across 5 assets, run world events, compute grade.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import type {
  PortfolioManagerState,
  PortfolioManagerGrade,
  PortfolioManagerScore,
} from './portfolioManagerTypes';
import { portfolioManagerConfig, ASSET_CLASSES, WORLD_EVENTS } from './portfolioManagerData';

// ── Initial state ────────────────────────────────────────────────────────

function createInitialAllocations(): Record<string, number> {
  const equal = Math.floor(100 / ASSET_CLASSES.length);
  const remainder = 100 - equal * ASSET_CLASSES.length;
  const allocs: Record<string, number> = {};
  ASSET_CLASSES.forEach((a, i) => {
    allocs[a.id] = equal + (i === 0 ? remainder : 0);
  });
  return allocs;
}

function createInitialState(): PortfolioManagerState {
  return {
    allocations: createInitialAllocations(),
    portfolioValue: portfolioManagerConfig.budget,
    eventHistory: [],
    currentEventIndex: -1,
    isComplete: false,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Apply a single world event to the portfolio, returning the new value. */
function applyEvent(
  value: number,
  allocations: Record<string, number>,
  impacts: Record<string, number>,
): number {
  let totalImpact = 0;
  for (const assetId of Object.keys(allocations)) {
    const weight = allocations[assetId] / 100;
    const impact = impacts[assetId] ?? 0;
    totalImpact += weight * impact;
  }
  return value * (1 + totalImpact);
}

/** Standard deviation of an array of numbers. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / values.length);
}

/** Grade based on final value, volatility, and diversification. */
function calcGrade(
  finalValue: number,
  budget: number,
  volatility: number,
  diversified: boolean,
): PortfolioManagerGrade {
  const returnPct = (finalValue - budget) / budget;
  const isPositive = returnPct > 0;

  // S: survived all events with positive return AND diversified AND low volatility
  if (isPositive && diversified && volatility < 25000) return 'S';
  // A: positive return AND diversified
  if (isPositive && diversified) return 'A';
  // B: positive return OR (diversified with small loss)
  if (isPositive || (diversified && returnPct > -0.05)) return 'B';
  // C: moderate loss (>-15%)
  if (returnPct > -0.15) return 'C';
  return 'F';
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function usePortfolioManager() {
  const [state, setState] = useState<PortfolioManagerState>(createInitialState);
  const eventTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Phase 1: Allocation ─────────────────────────────────────────────

  /** Set allocation for one asset. Distributes remainder proportionally to others. */
  const setAllocation = useCallback((assetId: string, percent: number) => {
    setState((prev) => {
      if (prev.currentEventIndex >= 0 || prev.isComplete) return prev;

      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      const otherIds = ASSET_CLASSES.map((a) => a.id).filter((id) => id !== assetId);
      const remaining = 100 - clamped;

      const newAllocs: Record<string, number> = { ...prev.allocations };
      newAllocs[assetId] = clamped;

      if (otherIds.length > 0) {
        const otherEqual = Math.floor(remaining / otherIds.length);
        const otherRemainder = remaining - otherEqual * otherIds.length;
        otherIds.forEach((id, i) => {
          newAllocs[id] = otherEqual + (i === 0 ? otherRemainder : 0);
        });
      }

      return { ...prev, allocations: newAllocs };
    });
  }, []);

  // ── Phase 2: Events ─────────────────────────────────────────────────

  /** Fire the next event (or complete if all done). */
  const fireNextEvent = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextIdx = prev.currentEventIndex + 1;
      if (nextIdx >= WORLD_EVENTS.length) {
        // All events done
        return { ...prev, isComplete: true };
      }

      const event = WORLD_EVENTS[nextIdx];
      const valueBefore = prev.portfolioValue;
      const valueAfter = applyEvent(valueBefore, prev.allocations, event.impacts);

      return {
        ...prev,
        portfolioValue: Math.round(valueAfter),
        eventHistory: [
          ...prev.eventHistory,
          { eventId: event.id, valueBefore, valueAfter: Math.round(valueAfter) },
        ],
        currentEventIndex: nextIdx,
      };
    });
  }, []);

  /** Lock the portfolio and start auto-playing events (3s per event). */
  const lockAndPlay = useCallback(() => {
    setState((prev) => {
      if (prev.currentEventIndex >= 0 || prev.isComplete) return prev;
      // Move to event phase
      return { ...prev, currentEventIndex: -1 };
    });

    // Fire first event immediately
    fireNextEvent();

    // Auto-fire remaining events at 3s intervals
    let firedCount = 1;
    eventTimerRef.current = setInterval(() => {
      firedCount++;
      fireNextEvent();
      if (firedCount >= WORLD_EVENTS.length) {
        if (eventTimerRef.current) {
          clearInterval(eventTimerRef.current);
          eventTimerRef.current = null;
        }
      }
    }, 3000);
  }, [fireNextEvent]);

  /** Reset to initial state. */
  const reset = useCallback(() => {
    if (eventTimerRef.current) {
      clearInterval(eventTimerRef.current);
      eventTimerRef.current = null;
    }
    setState(createInitialState());
  }, []);

  // ── Computed values ─────────────────────────────────────────────────

  const isBuilding = state.currentEventIndex === -1 && !state.isComplete;
  const isPlayingEvents = state.currentEventIndex >= 0 && !state.isComplete;

  /** Check if portfolio is diversified (no single asset > 40%). */
  const isDiversified = useMemo(() => {
    const maxAlloc = Math.max(...Object.values(state.allocations));
    return maxAlloc <= 40;
  }, [state.allocations]);

  /** Max drawdown: worst single-event percentage drop. */
  const maxDrawdown = useMemo(() => {
    if (state.eventHistory.length === 0) return 0;
    let worst = 0;
    for (const entry of state.eventHistory) {
      const change = (entry.valueAfter - entry.valueBefore) / entry.valueBefore;
      if (change < worst) worst = change;
    }
    return worst; // negative decimal, e.g., -0.15
  }, [state.eventHistory]);

  /** Volatility: std dev of value changes across events. */
  const volatility = useMemo(() => {
    if (state.eventHistory.length < 2) return 0;
    const changes = state.eventHistory.map((e) => e.valueAfter - e.valueBefore);
    return Math.round(stdDev(changes));
  }, [state.eventHistory]);

  /** "100% stocks" comparison value for ghost line. */
  const stocksOnlyValue = useMemo(() => {
    let val = portfolioManagerConfig.budget;
    for (const event of WORLD_EVENTS.slice(0, state.eventHistory.length)) {
      const impact = event.impacts['us-stocks'] ?? 0;
      val = val * (1 + impact);
    }
    return Math.round(val);
  }, [state.eventHistory.length]);

  /** Score, computed only when complete. */
  const score: PortfolioManagerScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    return {
      grade: calcGrade(state.portfolioValue, portfolioManagerConfig.budget, volatility, isDiversified),
      finalValue: state.portfolioValue,
      maxDrawdown,
      volatility,
      diversificationBonus: isDiversified,
    };
  }, [state.isComplete, state.portfolioValue, volatility, isDiversified, maxDrawdown]);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (eventTimerRef.current) {
        clearInterval(eventTimerRef.current);
        eventTimerRef.current = null;
      }
    };
  }, []);

  return {
    state,
    config: portfolioManagerConfig,
    isBuilding,
    isPlayingEvents,
    isDiversified,
    maxDrawdown,
    volatility,
    stocksOnlyValue,
    score,
    setAllocation,
    lockAndPlay,
    fireNextEvent,
    reset,
  };
}
