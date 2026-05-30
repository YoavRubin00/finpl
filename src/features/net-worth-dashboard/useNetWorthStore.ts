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

interface NetWorthState {
  assets: Asset[];

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

      totalValue: () => get().assets.reduce((s, a) => s + a.value, 0),
      totalLiquid: () =>
        get()
          .assets.filter((a) => a.liquid)
          .reduce((s, a) => s + a.value, 0),
      totalMonthlyDeposit: () =>
        get().assets.reduce((s, a) => s + a.monthlyDeposit, 0),
      projectedAnnualGrowth: () =>
        get().assets.reduce(
          (s, a) => s + (a.value * effectiveReturnPct(a)) / 100,
          0,
        ),
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
      partialize: (state) => ({ assets: state.assets }),
    },
  ),
);
