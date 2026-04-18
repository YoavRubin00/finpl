import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { ASSET_BY_ID } from './tradingHubData';
import type { AssetType, ChartMode } from './tradingHubTypes';
import { useTradingStore } from './useTradingStore';

const DEFAULT_UNLOCKED: AssetType[] = ['index', 'commodity'];

interface TradingHubUiState {
  watchlist: string[];
  unlockedAssetTypes: AssetType[];
  dismissedTipDate: string | null;
  /** null = user hasn't chosen yet → show onboarding. 'simple' / 'advanced' after choice. */
  chartMode: ChartMode | null;
  /** MA period used when advanced mode is active. Common values: 20, 50, 100, 200. */
  chartMAPeriod: number;
  _hydrated: boolean;

  toggleWatchlist: (assetId: string) => void;
  isWatched: (assetId: string) => boolean;
  unlockAssetType: (type: AssetType) => boolean;
  isAssetTypeUnlocked: (type: AssetType) => boolean;
  dismissTipForToday: (todayKey: string) => void;
  hasDismissedTipForDate: (todayKey: string) => boolean;
  setChartMode: (mode: ChartMode) => void;
  setChartMAPeriod: (period: number) => void;
}

export const useTradingHubUiStore = create<TradingHubUiState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      unlockedAssetTypes: DEFAULT_UNLOCKED,
      dismissedTipDate: null,
      chartMode: null,
      chartMAPeriod: 20,
      _hydrated: false,

      toggleWatchlist: (assetId) => {
        const { watchlist } = get();
        if (watchlist.includes(assetId)) {
          set({ watchlist: watchlist.filter((id) => id !== assetId) });
        } else {
          set({ watchlist: [...watchlist, assetId] });
        }
      },

      isWatched: (assetId) => get().watchlist.includes(assetId),

      // Returns true when this call actually unlocked the type (was previously locked).
      unlockAssetType: (type) => {
        const { unlockedAssetTypes } = get();
        if (unlockedAssetTypes.includes(type)) return false;
        set({ unlockedAssetTypes: [...unlockedAssetTypes, type] });
        return true;
      },

      isAssetTypeUnlocked: (type) => get().unlockedAssetTypes.includes(type),

      dismissTipForToday: (todayKey) => {
        set({ dismissedTipDate: todayKey });
      },

      hasDismissedTipForDate: (todayKey) => get().dismissedTipDate === todayKey,

      setChartMode: (mode) => {
        set({ chartMode: mode });
      },

      setChartMAPeriod: (period) => {
        set({ chartMAPeriod: period });
      },
    }),
    {
      name: 'trading-hub-ui-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        unlockedAssetTypes: state.unlockedAssetTypes,
        dismissedTipDate: state.dismissedTipDate,
        chartMode: state.chartMode,
        chartMAPeriod: state.chartMAPeriod,
      }),
      // Migrate existing users: if they already hold positions in stock/crypto,
      // grant access so we don't retroactively hide their assets.
      // We defer this to the next tick so `useTradingStore`'s own rehydration
      // has a chance to complete even if it hydrates slower than this store.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const applyMigration = (): void => {
          const positions = useTradingStore.getState().positions;
          const heldTypes = new Set<AssetType>();
          for (const pos of positions) {
            const asset = ASSET_BY_ID.get(pos.assetId);
            if (asset) heldTypes.add(asset.type);
          }
          const current = useTradingHubUiStore.getState().unlockedAssetTypes;
          const merged = [...current];
          let changed = false;
          for (const t of heldTypes) {
            if (!merged.includes(t)) {
              merged.push(t);
              changed = true;
            }
          }
          if (changed) {
            useTradingHubUiStore.setState({ unlockedAssetTypes: merged });
          }
          useTradingHubUiStore.setState({ _hydrated: true });
        };
        // Defer so both persist stores complete their rehydration before we read positions.
        setTimeout(applyMigration, 0);
      },
    },
  ),
);
