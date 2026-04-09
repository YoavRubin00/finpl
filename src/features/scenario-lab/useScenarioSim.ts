import { useState, useCallback, useRef, useEffect } from 'react';
import type { Scenario, SimState, ScenarioGrade } from './scenarioLabTypes';
import { STARTING_CAPITAL, calcGrade, GRADE_REWARDS } from './scenarioLabData';
import { useScenarioLabStore } from './useScenarioLabStore';
import { useEconomyStore } from '../economy/useEconomyStore';

const MONTH_DURATION_MS = 700; // how fast each month plays

function createInitialState(): SimState {
  return {
    phase: 'briefing',
    allocation: {},
    currentMonth: 0,
    portfolioValue: STARTING_CAPITAL,
    portfolioHistory: [STARTING_CAPITAL],
    activeHeadline: null,
    finalGrade: null,
    finalValue: STARTING_CAPITAL,
  };
}

export function useScenarioSim(scenario: Scenario) {
  const [state, setState] = useState<SimState>(createInitialState());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardedRef = useRef(false);

  // Allocation sum
  const allocationTotal = Object.values(state.allocation).reduce(
    (sum, v) => sum + v,
    0,
  );
  const isValid = allocationTotal === 100;

  const setAllocation = useCallback(
    (sectorId: string, pct: number) => {
      setState((prev) => ({
        ...prev,
        allocation: { ...prev.allocation, [sectorId]: Math.max(0, Math.min(100, pct)) },
      }));
    },
    [],
  );

  const goToAllocation = useCallback(() => {
    // Init allocations with slight variation so chart shows movement
    const n = scenario.sectors.length;
    const base = Math.floor(100 / n);
    const spreads = [10, 0, -5, -5, 0, 0]; // small deviation from equal
    const init: Record<string, number> = {};
    let remaining = 100;
    scenario.sectors.forEach((s, i) => {
      if (i === n - 1) {
        init[s.id] = remaining;
      } else {
        const val = Math.max(5, Math.min(60, base + (spreads[i] ?? 0)));
        init[s.id] = val;
        remaining -= val;
      }
    });
    setState((prev) => ({ ...prev, phase: 'allocation', allocation: init }));
  }, [scenario]);

  /**
   * Pre-compute a realistic monthly path with noise for each sector.
   * Uses scenario events as trend waypoints and adds deterministic wobble
   * so the chart looks like a real market chart (zigzag, not a straight line).
   */
  const monthlyPathRef = useRef<number[] | null>(null);

  const buildRealisticPath = useCallback(
    (alloc: Record<string, number>): number[] => {
      const path: number[] = [STARTING_CAPITAL];

      for (let month = 1; month <= 12; month++) {
        let value = 0;
        for (const sector of scenario.sectors) {
          const pct = (alloc[sector.id] ?? 0) / 100;
          const sectorStart = STARTING_CAPITAL * pct;
          const sectorFinal = STARTING_CAPITAL * pct * sector.scenarioMultiplier;
          const baseProgress = month / 12;

          // Deterministic wobble using sine waves — different per sector
          const seed = sector.scenarioMultiplier * 1000;
          const noise1 = Math.sin(month * 2.3 + seed) * 0.04;
          const noise2 = Math.cos(month * 1.7 + seed * 0.5) * 0.025;
          const noise3 = Math.sin(month * 3.1 + seed * 0.3) * 0.015;

          // Events create small "shock" bumps
          const eventThisMonth = scenario.events.find((e) => e.month === month);
          const eventShock = eventThisMonth
            ? (eventThisMonth.marketImpact < 1 ? -0.025 : 0.02)
            : 0;

          const adjustedProgress = baseProgress + noise1 + noise2 + noise3 + eventShock;
          const sectorValue = sectorStart + (sectorFinal - sectorStart) * Math.max(0, adjustedProgress);
          value += sectorValue;
        }
        path.push(Math.round(value));
      }

      // Ensure final month matches exact calculated value
      let exactFinal = 0;
      for (const sector of scenario.sectors) {
        const pct = (alloc[sector.id] ?? 0) / 100;
        exactFinal += STARTING_CAPITAL * pct * sector.scenarioMultiplier;
      }
      path[12] = Math.round(exactFinal);

      return path;
    },
    [scenario],
  );

  /** Calculate portfolio value at a given month using pre-computed realistic path */
  const calcValueAtMonth = useCallback(
    (month: number, alloc: Record<string, number>): number => {
      if (!monthlyPathRef.current) {
        monthlyPathRef.current = buildRealisticPath(alloc);
      }
      return monthlyPathRef.current[month] ?? STARTING_CAPITAL;
    },
    [buildRealisticPath],
  );

  const startSimulation = useCallback(() => {
    if (!isValid) return;
    // Reset path so it gets rebuilt with current allocation
    monthlyPathRef.current = null;
    setState((prev) => ({
      ...prev,
      phase: 'simulating',
      currentMonth: 0,
      portfolioValue: STARTING_CAPITAL,
      portfolioHistory: [STARTING_CAPITAL],
      activeHeadline: null,
    }));
  }, [isValid]);

  // Auto-play simulation
  useEffect(() => {
    if (state.phase !== 'simulating') return;

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const nextMonth = prev.currentMonth + 1;
        if (nextMonth > 12) {
          // Simulation complete
          if (intervalRef.current) clearInterval(intervalRef.current);
          const finalVal = calcValueAtMonth(12, prev.allocation);
          const grade = calcGrade(finalVal, STARTING_CAPITAL);
          return {
            ...prev,
            phase: 'results',
            currentMonth: 12,
            portfolioValue: finalVal,
            finalValue: finalVal,
            finalGrade: grade,
            activeHeadline: null,
          };
        }

        const newValue = calcValueAtMonth(nextMonth, prev.allocation);
        const event = scenario.events.find((e) => e.month === nextMonth);

        return {
          ...prev,
          currentMonth: nextMonth,
          portfolioValue: newValue,
          portfolioHistory: [...prev.portfolioHistory, newValue],
          activeHeadline: event?.headline ?? null,
        };
      });
    }, MONTH_DURATION_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.phase, scenario, calcValueAtMonth]);

  // Award rewards when results phase
  useEffect(() => {
    if (state.phase !== 'results' || rewardedRef.current || !state.finalGrade) return;
    rewardedRef.current = true;

    const rewards = GRADE_REWARDS[state.finalGrade];
    const economy = useEconomyStore.getState();
    economy.addXP(rewards.xp, 'sim_complete');
    economy.addCoins(rewards.coins);

    useScenarioLabStore.getState().recordCompletion(
      scenario.id,
      state.finalGrade,
      state.finalValue,
    );
  }, [state.phase, state.finalGrade, state.finalValue, scenario.id]);

  const reset = useCallback(() => {
    rewardedRef.current = false;
    monthlyPathRef.current = null;
    setState(createInitialState());
  }, []);

  const goToBriefing = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'briefing' }));
  }, []);

  return {
    state,
    setAllocation,
    goToAllocation,
    goToBriefing,
    startSimulation,
    isValid,
    allocationTotal,
    reset,
  };
}
