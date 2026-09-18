/**
 * Live-holdings store — the user's REAL stock/crypto positions.
 * Persists locally (MMKV / AsyncStorage), mirrors useNetWorthStore's
 * privacy stance: never uploaded, never shared. Tracking only.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../../lib/zustandStorage';
import type { Holding } from './holdingsCatalog';

interface NewHoldingInput {
  ticker: string;
  nameHe: string;
  units: number;
  avgBuyPrice?: number;
}

interface HoldingsState {
  holdings: Holding[];

  addHolding: (init: NewHoldingInput) => string;
  updateHolding: (
    id: string,
    patch: Partial<Pick<Holding, 'units' | 'avgBuyPrice'>>,
  ) => void;
  removeHolding: (id: string) => void;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useHoldingsStore = create<HoldingsState>()(
  persist(
    (set, get) => ({
      holdings: [],

      addHolding: (init) => {
        // One row per ticker — adding an existing ticker merges units and
        // recomputes the weighted average buy price (real-broker behavior).
        const existing = get().holdings.find((h) => h.ticker === init.ticker);
        if (existing) {
          const mergedUnits = existing.units + Math.max(0, init.units);
          const bothPriced =
            typeof existing.avgBuyPrice === 'number' &&
            typeof init.avgBuyPrice === 'number' &&
            mergedUnits > 0;
          const mergedAvg = bothPriced
            ? (existing.units * (existing.avgBuyPrice ?? 0) +
                init.units * (init.avgBuyPrice ?? 0)) /
              mergedUnits
            : existing.avgBuyPrice ?? init.avgBuyPrice;
          set({
            holdings: get().holdings.map((h) =>
              h.id === existing.id
                ? { ...h, units: mergedUnits, avgBuyPrice: mergedAvg }
                : h,
            ),
          });
          return existing.id;
        }

        const id = generateId();
        const holding: Holding = {
          id,
          ticker: init.ticker,
          nameHe: init.nameHe,
          units: Math.max(0, init.units),
          avgBuyPrice:
            typeof init.avgBuyPrice === 'number' && init.avgBuyPrice > 0
              ? init.avgBuyPrice
              : undefined,
          createdAt: Date.now(),
        };
        set({ holdings: [...get().holdings, holding] });
        return id;
      },

      updateHolding: (id, patch) => {
        set({
          holdings: get().holdings.map((h) =>
            h.id === id
              ? {
                  ...h,
                  units:
                    patch.units !== undefined
                      ? Math.max(0, patch.units)
                      : h.units,
                  avgBuyPrice:
                    patch.avgBuyPrice !== undefined
                      ? patch.avgBuyPrice > 0
                        ? patch.avgBuyPrice
                        : undefined
                      : h.avgBuyPrice,
                }
              : h,
          ),
        });
      },

      removeHolding: (id) => {
        set({ holdings: get().holdings.filter((h) => h.id !== id) });
      },
    }),
    {
      name: '@finplay/holdings',
      storage: createJSONStorage(() => zustandStorage),
      version: 2,
      partialize: (state) => ({ holdings: state.holdings }),
      // v1 → v2: `avgBuyPriceUsd` became currency-aware `avgBuyPrice` (UX-31:
      // TASE shares are bought in shekels; the old name misled the P&L math).
      migrate: (persisted, version) => {
        const state = persisted as { holdings?: Array<Record<string, unknown>> };
        if (version < 2 && Array.isArray(state.holdings)) {
          state.holdings = state.holdings.map((h) => {
            const { avgBuyPriceUsd, ...rest } = h;
            return typeof avgBuyPriceUsd === 'number' ? { ...rest, avgBuyPrice: avgBuyPriceUsd } : rest;
          });
        }
        return state as unknown as HoldingsState;
      },
    },
  ),
);
