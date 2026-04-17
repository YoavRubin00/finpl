import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { ASSET_BY_ID } from './tradingHubData';
import type { AssetType } from './tradingHubTypes';
import { useTradingStore } from './useTradingStore';

const DEFAULT_UNLOCKED: AssetType[] = ['index', 'commodity'];

interface TradingHubUiState {
  watchlist: string[];
  unlockedAssetTypes: AssetType[];
  dismissedTipDate: string | null;
  _hydrated: boolean;

  toggleWatchlist: (assetId: string) => void;
  isWatched: (assetId: string) => boolean;
  unlockAssetType: (type: AssetType) => boolean;
  isAssetTypeUnlocked: (type: AssetType) => boolean;
  dismissTipForToday: (todayKey: string) => void;
  hasDismissedTipForDate: (todayKey: string) => boolean;
}

export const useTradingHubUiStore = create<TradingHubUiState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      unlockedAssetTypes: DEFAULT_UNLOCKED,
      dismissedTipDate: null,
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
    }),
    {
      name: 'trading-hub-ui-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        unlockedAssetTypes: state.unlockedAssetTypes,
        dismissedTipDate: state.dismissedTipDate,
      }),
      // Migrate existing users: if they already hold positions in stock/crypto,
      // grant access so we don't retroactively hide their assets.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const positions = useTradingStore.getState().positions;
        const heldTypes = new Set<AssetType>();
        for (const pos of positions) {
          const asset = ASSET_BY_ID.get(pos.assetId);
          if (asset) heldTypes.add(asset.type);
        }
        const merged = [...state.unlockedAssetTypes];
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
      },
    },
  ),
);
