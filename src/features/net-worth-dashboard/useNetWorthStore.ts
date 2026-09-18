/**
 * Net Worth store — user's real assets. Persists locally via MMKV (mobile)
 * or AsyncStorage (web). Never uploaded; never shared.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import {
  type Asset,
  type AssetType,
  type Track,
  effectiveReturnPct,
  findTypeMeta,
} from './assetCatalog';

interface NewAssetInput {
  type: AssetType;
  name: string;
  value?: number;
  liquid?: boolean;
  track?: Track;
  monthlyDeposit?: number;
  expectedReturnPct?: number;
  notes?: string;
}

/** Live-holdings snapshot written by HoldingsSection after every successful
 *  quote fetch, so the Tools-hub hero and the dashboard totals count real
 *  stocks without the hub having to run the quote query itself (UX-15). */
export interface HoldingsSnapshot {
  valueIls: number;
  count: number;
  /** epoch ms of the quote fetch this value came from */
  at: number;
}

/** Stocks are equities — projected at the catalog's equity-track default. */
const HOLDINGS_EQUITY_RETURN_PCT = 8;

interface NetWorthState {
  assets: Asset[];
  holdingsSnapshot: HoldingsSnapshot | null;
  setHoldingsSnapshot: (snap: HoldingsSnapshot | null) => void;

  addAsset: (init: NewAssetInput) => string;
  updateAsset: (id: string, patch: Partial<Omit<Asset, 'id' | 'createdAt'>>) => void;
  removeAsset: (id: string) => void;
  clearAll: () => void;

  totalValue: () => number;
  totalLiquid: () => number;
  totalMonthlyDeposit: () => number;
  projectedAnnualGrowth: () => number;
  yoyDeltaPct: () => number;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useNetWorthStore = create<NetWorthState>()(
  persist(
    (set, get) => ({
      assets: [],
      holdingsSnapshot: null,
      setHoldingsSnapshot: (snap) => {
        const prev = get().holdingsSnapshot;
        // Skip no-op writes — the section reports on every render pass.
        if (
          (prev === null && snap === null) ||
          (prev && snap && prev.valueIls === snap.valueIls && prev.count === snap.count)
        ) {
          return;
        }
        set({ holdingsSnapshot: snap });
      },

      addAsset: (init) => {
        const id = generateId();
        const liquid = init.liquid ?? findTypeMeta(init.type).defaultLiquid;
        const asset: Asset = {
          id,
          type: init.type,
          name: init.name.trim(),
          value: Math.max(0, init.value ?? 0),
          liquid,
          track: init.track,
          monthlyDeposit: Math.max(0, init.monthlyDeposit ?? 0),
          expectedReturnPct: init.expectedReturnPct,
          notes: init.notes?.trim() || undefined,
          createdAt: Date.now(),
        };
        set({ assets: [...get().assets, asset] });
        return id;
      },

      updateAsset: (id, patch) => {
        set({
          assets: get().assets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...patch,
                  name: patch.name !== undefined ? patch.name.trim() : a.name,
                  notes:
                    patch.notes !== undefined
                      ? patch.notes.trim() || undefined
                      : a.notes,
                  value:
                    patch.value !== undefined
                      ? Math.max(0, patch.value)
                      : a.value,
                  monthlyDeposit:
                    patch.monthlyDeposit !== undefined
                      ? Math.max(0, patch.monthlyDeposit)
                      : a.monthlyDeposit,
                }
              : a,
          ),
        });
      },

      removeAsset: (id) => {
        set({ assets: get().assets.filter((a) => a.id !== id) });
      },

      clearAll: () => set({ assets: [] }),

      // Totals include the live-holdings snapshot: stocks are liquid and
      // project at the equity default, same as an investment_account asset.
      totalValue: () =>
        get().assets.reduce((s, a) => s + a.value, 0) +
        (get().holdingsSnapshot?.valueIls ?? 0),
      totalLiquid: () =>
        get()
          .assets.filter((a) => a.liquid)
          .reduce((s, a) => s + a.value, 0) +
        (get().holdingsSnapshot?.valueIls ?? 0),
      totalMonthlyDeposit: () =>
        get().assets.reduce((s, a) => s + a.monthlyDeposit, 0),
      projectedAnnualGrowth: () =>
        get().assets.reduce(
          (s, a) => s + (a.value * effectiveReturnPct(a)) / 100,
          0,
        ) +
        ((get().holdingsSnapshot?.valueIls ?? 0) * HOLDINGS_EQUITY_RETURN_PCT) / 100,
      yoyDeltaPct: () => {
        const total = get().totalValue();
        if (total <= 0) return 0;
        return get().projectedAnnualGrowth() / total;
      },
    }),
    {
      name: '@finplay/net-worth',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      partialize: (state) => ({ assets: state.assets, holdingsSnapshot: state.holdingsSnapshot }),
    },
  ),
);
