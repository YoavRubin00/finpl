import { create } from 'zustand';
import { getApiBase } from '../db/apiBase';
import type { LiveMarketData } from '../features/finfeed/liveMarketTypes';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface LiveMarketState {
  data: LiveMarketData | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetch: () => Promise<void>;
}

export const useLiveMarketStore = create<LiveMarketState>()((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetch: async () => {
    const { lastFetchedAt, loading } = get();
    if (loading) return;
    if (lastFetchedAt && Date.now() - lastFetchedAt < TTL_MS) return;

    set({ loading: true, error: null });
    try {
      const res = await fetch(`${getApiBase()}/api/market/live`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as LiveMarketData;
      set({ data, loading: false, lastFetchedAt: Date.now() });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'שגיאה' });
    }
  },
}));