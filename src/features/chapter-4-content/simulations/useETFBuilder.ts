/**
 * SIM 21: בנה את הסל (Build the ETF Basket), Module 4-21
 * Hook: select/deselect ETFs, manage allocations, compute diversification score.
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  ETFAllocation,
  ETFBuilderState,
  ETFBuilderGrade,
  ETFBuilderScore,
  ETFType,
} from './etfBuilderTypes';
import { etfBuilderConfig, ETF_CATALOG } from './etfBuilderData';

// ── Geographic region mapping ────────────────────────────────────────────

type GeoRegion = 'us' | 'israel' | 'europe' | 'global';

const ETF_GEO_MAP: Record<string, GeoRegion> = {
  sp500: 'us',
  nasdaq100: 'us',
  'gov-bonds': 'global',
  ta125: 'israel',
  'reit-global': 'global',
  emerging: 'global',
  'europe-stoxx': 'europe',
  gold: 'global',
};

// ── Helpers ──────────────────────────────────────────────────────────────

/** Count unique asset types in the selection. */
function countAssetTypes(etfIds: string[]): number {
  const types = new Set<ETFType>();
  for (const id of etfIds) {
    const etf = ETF_CATALOG.find((e) => e.id === id);
    if (etf) types.add(etf.type);
  }
  return types.size;
}

/** Count unique geographic regions in the selection. */
function countGeoRegions(etfIds: string[]): number {
  const regions = new Set<GeoRegion>();
  for (const id of etfIds) {
    const region = ETF_GEO_MAP[id];
    if (region) regions.add(region);
  }
  return regions.size;
}

/** Diversification score: 0-100 based on asset types × geographic regions covered. */
function calcDiversificationScore(etfIds: string[]): number {
  if (etfIds.length === 0) return 0;

  const assetTypes = countAssetTypes(etfIds);
  const geoRegions = countGeoRegions(etfIds);

  // Max 4 asset types, max 4 geo regions → each contributes up to 50 points
  const typeScore = (assetTypes / 4) * 50;
  const geoScore = (geoRegions / 4) * 50;

  return Math.min(100, Math.round(typeScore + geoScore));
}

/** Blended estimated annual return from allocations (weighted average). */
function calcEstimatedReturn(allocations: ETFAllocation[]): number {
  if (allocations.length === 0) return 0;

  let weighted = 0;
  for (const alloc of allocations) {
    const etf = ETF_CATALOG.find((e) => e.id === alloc.etfId);
    if (etf) weighted += etf.annualReturn * (alloc.percent / 100);
  }
  return Math.round(weighted * 1000) / 1000; // e.g. 0.082
}

/** Blended risk from allocations (weighted average of risk levels, 1-5 scale). */
function calcEstimatedRisk(allocations: ETFAllocation[]): number {
  if (allocations.length === 0) return 0;

  let weighted = 0;
  for (const alloc of allocations) {
    const etf = ETF_CATALOG.find((e) => e.id === alloc.etfId);
    if (etf) weighted += etf.riskLevel * (alloc.percent / 100);
  }
  return Math.round(weighted * 10) / 10; // e.g. 2.8
}

/** Grade based on diversification quality. */
function calcGrade(divScore: number, assetTypes: number, geoRegions: number): ETFBuilderGrade {
  if (divScore >= 90 && assetTypes >= 3 && geoRegions >= 3) return 'S';
  if (divScore >= 70 && assetTypes >= 3) return 'A';
  if (divScore >= 50 && assetTypes >= 2) return 'B';
  if (divScore >= 25) return 'C';
  return 'F';
}

// ── Initial state ────────────────────────────────────────────────────────

function createInitialState(): ETFBuilderState {
  return {
    selectedETFs: [],
    diversificationScore: 0,
    estimatedReturn: 0,
    estimatedRisk: 0,
    isComplete: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useETFBuilder() {
  const [state, setState] = useState<ETFBuilderState>(createInitialState);

  // ── Select / Deselect ────────────────────────────────────────────────

  /** Add an ETF to the basket. Allocations auto-equalize. */
  const addETF = useCallback((etfId: string) => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      if (prev.selectedETFs.some((e) => e.etfId === etfId)) return prev;
      if (prev.selectedETFs.length >= etfBuilderConfig.maxETFs) return prev;

      const newSelected = [...prev.selectedETFs, { etfId, percent: 0 }];
      const equalPercent = Math.floor(100 / newSelected.length);
      const remainder = 100 - equalPercent * newSelected.length;

      const equalized: ETFAllocation[] = newSelected.map((e, i) => ({
        etfId: e.etfId,
        percent: equalPercent + (i === 0 ? remainder : 0),
      }));

      const ids = equalized.map((e) => e.etfId);
      return {
        ...prev,
        selectedETFs: equalized,
        diversificationScore: calcDiversificationScore(ids),
        estimatedReturn: calcEstimatedReturn(equalized),
        estimatedRisk: calcEstimatedRisk(equalized),
      };
    });
  }, []);

  /** Remove an ETF from the basket. Remaining allocations re-equalize. */
  const removeETF = useCallback((etfId: string) => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const filtered = prev.selectedETFs.filter((e) => e.etfId !== etfId);
      if (filtered.length === prev.selectedETFs.length) return prev; // not found

      if (filtered.length === 0) return createInitialState();

      const equalPercent = Math.floor(100 / filtered.length);
      const remainder = 100 - equalPercent * filtered.length;

      const equalized: ETFAllocation[] = filtered.map((e, i) => ({
        etfId: e.etfId,
        percent: equalPercent + (i === 0 ? remainder : 0),
      }));

      const ids = equalized.map((e) => e.etfId);
      return {
        ...prev,
        selectedETFs: equalized,
        diversificationScore: calcDiversificationScore(ids),
        estimatedReturn: calcEstimatedReturn(equalized),
        estimatedRisk: calcEstimatedRisk(equalized),
      };
    });
  }, []);

  /** Manually set allocation for one ETF. Remaining ETFs adjust proportionally. */
  const setAllocation = useCallback((etfId: string, percent: number) => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const idx = prev.selectedETFs.findIndex((e) => e.etfId === etfId);
      if (idx === -1) return prev;

      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      const remaining = 100 - clamped;
      const otherCount = prev.selectedETFs.length - 1;

      let updated: ETFAllocation[];
      if (otherCount === 0) {
        updated = [{ etfId, percent: 100 }];
      } else {
        // Distribute remaining evenly among others
        const otherPercent = Math.floor(remaining / otherCount);
        const otherRemainder = remaining - otherPercent * otherCount;
        let otherIdx = 0;

        updated = prev.selectedETFs.map((e) => {
          if (e.etfId === etfId) return { etfId, percent: clamped };
          const p = otherPercent + (otherIdx === 0 ? otherRemainder : 0);
          otherIdx++;
          return { etfId: e.etfId, percent: p };
        });
      }

      const ids = updated.map((e) => e.etfId);
      return {
        ...prev,
        selectedETFs: updated,
        diversificationScore: calcDiversificationScore(ids),
        estimatedReturn: calcEstimatedReturn(updated),
        estimatedRisk: calcEstimatedRisk(updated),
      };
    });
  }, []);

  // ── Complete / Reset ──────────────────────────────────────────────────

  const complete = useCallback(() => {
    setState((prev) => {
      if (prev.selectedETFs.length === 0) return prev;
      return { ...prev, isComplete: true };
    });
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // ── Computed score ────────────────────────────────────────────────────

  const totalExpenseRatio = useMemo(() => {
    let weighted = 0;
    for (const alloc of state.selectedETFs) {
      const etf = ETF_CATALOG.find((e) => e.id === alloc.etfId);
      if (etf) weighted += etf.expenseRatio * (alloc.percent / 100);
    }
    return Math.round(weighted * 1000) / 1000;
  }, [state.selectedETFs]);

  const score: ETFBuilderScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const ids = state.selectedETFs.map((e) => e.etfId);
    const assetTypes = countAssetTypes(ids);
    const geoRegions = countGeoRegions(ids);

    return {
      grade: calcGrade(state.diversificationScore, assetTypes, geoRegions),
      diversification: state.diversificationScore,
      geographicSpread: geoRegions,
      assetTypeSpread: assetTypes,
    };
  }, [state.isComplete, state.selectedETFs, state.diversificationScore]);

  return {
    state,
    config: etfBuilderConfig,
    totalExpenseRatio,
    score,
    addETF,
    removeETF,
    setAllocation,
    complete,
    reset,
  };
}
