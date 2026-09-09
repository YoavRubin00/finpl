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
  avgBuyPriceUsd?: number;
}

interface HoldingsState {
  holdings: Holding[];

  addHolding: (init: NewHoldingInput) => string;
  updateHolding: (
    id: string,
    patch: Partial<Pick<Holding, 'units' | 'avgBuyPriceUsd'>>,
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
            typeof existing.avgBuyPriceUsd === 'number' &&
            typeof init.avgBuyPriceUsd === 'number' &&
            mergedUnits > 0;
          const mergedAvg = bothPriced
            ? (existing.units * (existing.avgBuyPriceUsd ?? 0) +
                init.units * (init.avgBuyPriceUsd ?? 0)) /
              mergedUnits
            : existing.avgBuyPriceUsd ?? init.avgBuyPriceUsd;
          set({
            holdings: get().holdings.map((h) =>
              h.id === existing.id
                ? { ...h, units: mergedUnits, avgBuyPriceUsd: mergedAvg }
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
          avgBuyPriceUsd:
            typeof init.avgBuyPriceUsd === 'number' && init.avgBuyPriceUsd > 0
              ? init.avgBuyPriceUsd
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
                  avgBuyPriceUsd:
                    patch.avgBuyPriceUsd !== undefined
                      ? patch.avgBuyPriceUsd > 0
                        ? patch.avgBuyPriceUsd
                        : undefined
                      : h.avgBuyPriceUsd,
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
      version: 1,
      partialize: (state) => ({ holdings: state.holdings }),
    },
  ),
);
