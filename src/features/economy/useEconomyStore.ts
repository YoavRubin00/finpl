/**
 * Backwards-compatibility shim for the legacy Zustand-based economy store.
 *
 * The source of truth has moved to ./useEconomy.ts (react-query) +
 * ./useEconomyUIStore.ts (UI bits like streak/boosts). Many legacy call sites
 * (~74 files: chapters, sims, fantasy, retention-loops, anon-advice, etc.)
 * still do `useEconomyStore((s) => s.coins)` or
 * `useEconomyStore.getState().addCoins(...)`. Rather than rewriting all of
 * them in one pass, this shim exposes the same API and forwards to the new
 * react-query cache + the existing `applyEconomyDelta` server endpoint.
 *
 * The shim's local Zustand state is kept in sync with the react-query cache
 * by subscribing to query-cache updates, so selector hooks (the second usage
 * pattern above) re-render correctly when the cache changes.
 */

import { create } from 'zustand';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from './useEconomy';
import { applyEconomyDelta, type Economy } from '../../lib/api/economy';

interface LegacyEconomyState {
  coins: number;
  xp: number;
  gems: number;
  virtualBalance: number;
  addCoins: (amount: number, source?: string) => void;
  addXP: (amount: number, source?: string) => void;
  addGems: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
}

function readCache(): Economy | null {
  return queryClient.getQueryData<Economy | null>(economyQueryKey) ?? null;
}

/** Optimistic delta to the react-query cache + fire-and-forget server sync.
 *  Rolls the cache back on server failure. */
function applyDelta(delta: {
  xpDelta?: number; coinsDelta?: number; gemsDelta?: number;
}): void {
  const prev = readCache();
  if (prev) {
    queryClient.setQueryData<Economy | null>(economyQueryKey, {
      ...prev,
      xp: (prev.xp ?? 0) + (delta.xpDelta ?? 0),
      coins: (prev.coins ?? 0) + (delta.coinsDelta ?? 0),
      gems: (prev.gems ?? 0) + (delta.gemsDelta ?? 0),
    });
  }
  applyEconomyDelta(delta)
    .then(() => queryClient.invalidateQueries({ queryKey: economyQueryKey }))
    .catch(() => {
      if (prev) queryClient.setQueryData(economyQueryKey, prev);
    });
}

export const useEconomyStore = create<LegacyEconomyState>(() => ({
  coins: 0,
  xp: 0,
  gems: 0,
  virtualBalance: 0,
  addCoins: (amount) => {
    if (amount === 0) return;
    applyDelta({ coinsDelta: amount });
  },
  addXP: (amount) => {
    if (amount === 0) return;
    applyDelta({ xpDelta: amount });
  },
  addGems: (amount) => {
    if (amount === 0) return;
    applyDelta({ gemsDelta: amount });
  },
  spendCoins: (amount) => {
    const cur = readCache()?.coins ?? 0;
    if (cur < amount) return false;
    applyDelta({ coinsDelta: -amount });
    return true;
  },
  spendGems: (amount) => {
    const cur = readCache()?.gems ?? 0;
    if (cur < amount) return false;
    applyDelta({ gemsDelta: -amount });
    return true;
  },
}));

// Sync react-query cache → this Zustand store so legacy selector hooks
// (`useEconomyStore((s) => s.coins)`) re-render on cache updates.
function syncFromCache(): void {
  const econ = readCache();
  useEconomyStore.setState({
    coins: econ?.coins ?? 0,
    xp: econ?.xp ?? 0,
    gems: econ?.gems ?? 0,
    virtualBalance: econ?.virtualBalance ? parseFloat(econ.virtualBalance) : 0,
  });
}

syncFromCache();
queryClient.getQueryCache().subscribe((event) => {
  if (event.query.queryKey[0] === 'economy') syncFromCache();
});
