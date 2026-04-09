import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  InflationRaceState,
  InflationRaceScore,
  InflationRaceGrade,
  InflatedProduct,
} from './inflationRaceTypes';
import { inflationRaceConfig } from './inflationRaceData';

const AUTO_PLAY_SPEED = 500; // ms per year during auto-play

// ── Helpers ─────────────────────────────────────────────────────────────

/** Calculate inflated prices and affordability for a given year */
function buildProductsForYear(year: number, money: number): InflatedProduct[] {
  return inflationRaceConfig.products.map((p) => {
    const currentPrice = p.basePrice * Math.pow(1 + inflationRaceConfig.inflationRate, year);
    return {
      ...p,
      currentPrice,
      affordable: money >= currentPrice,
    };
  });
}

/** Purchasing power as percentage of original */
function calcPurchasingPower(year: number): number {
  return 100 / Math.pow(1 + inflationRaceConfig.inflationRate, year);
}

/** Invested value after compound growth */
function calcInvestedValue(year: number): number {
  return inflationRaceConfig.initialMoney * Math.pow(1 + inflationRaceConfig.investmentReturn, year);
}

function createInitialState(): InflationRaceState {
  const year = 0;
  const money = inflationRaceConfig.initialMoney;
  const products = buildProductsForYear(year, money);
  return {
    currentYear: year,
    moneyValue: money,
    purchasingPower: 100,
    investedValue: money,
    products,
    affordableItems: products.filter((p) => p.affordable).length,
    isComplete: false,
    isAutoPlaying: false,
    showInvestedPath: false,
  };
}

const GRADE_MAP: { min: number; grade: InflationRaceGrade; label: string }[] = [
  { min: 18, grade: 'S', label: 'מדהים!' },
  { min: 14, grade: 'A', label: 'מצוין' },
  { min: 10, grade: 'B', label: 'טוב' },
  { min: 5, grade: 'C', label: 'סביר' },
];

// ── Hook ────────────────────────────────────────────────────────────────

export function useInflationRace() {
  const [state, setState] = useState<InflationRaceState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Set year directly (from slider) */
  const setYear = useCallback((year: number) => {
    const clamped = Math.max(0, Math.min(inflationRaceConfig.maxYears, year));
    const money = inflationRaceConfig.initialMoney;
    const products = buildProductsForYear(clamped, money);
    const investedProducts = buildProductsForYear(clamped, calcInvestedValue(clamped));

    setState((prev) => ({
      currentYear: clamped,
      moneyValue: money,
      purchasingPower: calcPurchasingPower(clamped),
      investedValue: calcInvestedValue(clamped),
      products: prev.showInvestedPath ? investedProducts : products,
      affordableItems: prev.showInvestedPath
        ? investedProducts.filter((p) => p.affordable).length
        : products.filter((p) => p.affordable).length,
      isComplete: clamped >= inflationRaceConfig.maxYears,
      isAutoPlaying: clamped >= inflationRaceConfig.maxYears ? false : prev.isAutoPlaying,
      showInvestedPath: prev.showInvestedPath,
    }));
  }, []);

  /** Toggle "invested path" view */
  const toggleInvestedPath = useCallback(() => {
    setState((prev) => {
      const showInvested = !prev.showInvestedPath;
      const money = showInvested ? calcInvestedValue(prev.currentYear) : inflationRaceConfig.initialMoney;
      const products = buildProductsForYear(prev.currentYear, money);
      return {
        ...prev,
        showInvestedPath: showInvested,
        products,
        affordableItems: products.filter((p) => p.affordable).length,
      };
    });
  }, []);

  /** Start auto-play: advance year by year from current to max */
  const startAutoPlay = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      return { ...prev, isAutoPlaying: true };
    });
  }, []);

  /** Stop auto-play */
  const stopAutoPlay = useCallback(() => {
    setState((prev) => ({ ...prev, isAutoPlaying: false }));
  }, []);

  /** Advance one year (used by auto-play interval) */
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      const nextYear = prev.currentYear + 1;
      const money = prev.showInvestedPath
        ? calcInvestedValue(nextYear)
        : inflationRaceConfig.initialMoney;
      const products = buildProductsForYear(nextYear, money);
      const isComplete = nextYear >= inflationRaceConfig.maxYears;

      return {
        ...prev,
        currentYear: nextYear,
        purchasingPower: calcPurchasingPower(nextYear),
        investedValue: calcInvestedValue(nextYear),
        products,
        affordableItems: products.filter((p) => p.affordable).length,
        isComplete,
        isAutoPlaying: isComplete ? false : prev.isAutoPlaying,
      };
    });
  }, []);

  /** Reset to initial state */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(createInitialState());
  }, []);

  /** Auto-play interval management */
  useEffect(() => {
    if (state.isAutoPlaying) {
      intervalRef.current = setInterval(tick, AUTO_PLAY_SPEED);
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
  }, [state.isAutoPlaying, tick]);

  /** Compute score when simulation is complete */
  const score: InflationRaceScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const maxYear = inflationRaceConfig.maxYears;
    const purchasingPower = calcPurchasingPower(maxYear);
    const purchasingPowerLost = 100 - purchasingPower;
    const investedValue = calcInvestedValue(maxYear);
    const investmentGain = ((investedValue - inflationRaceConfig.initialMoney) / inflationRaceConfig.initialMoney) * 100;
    const uninvestedProducts = buildProductsForYear(maxYear, inflationRaceConfig.initialMoney);
    const itemsLostAccess = uninvestedProducts.filter((p) => !p.affordable).length;
    const finalPurchasingPowerValue = inflationRaceConfig.initialMoney * (purchasingPower / 100);

    // Grade based on years explored (reaching 20 = best)
    let grade: InflationRaceGrade = 'F';
    let gradeLabel = 'צריך שיפור';
    for (const entry of GRADE_MAP) {
      if (maxYear >= entry.min) {
        grade = entry.grade;
        gradeLabel = entry.label;
        break;
      }
    }

    return {
      grade,
      gradeLabel,
      purchasingPowerLost,
      investmentGain,
      itemsLostAccess,
      finalPurchasingPowerValue,
      finalInvestedValue: investedValue,
    };
  }, [state.isComplete]);

  return {
    state,
    config: inflationRaceConfig,
    setYear,
    toggleInvestedPath,
    startAutoPlay,
    stopAutoPlay,
    reset,
    score,
  };
}
